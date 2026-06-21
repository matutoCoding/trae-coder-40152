import { Router, type Request, type Response } from 'express'
import type { Reservation, CreateReservationReq } from '../../shared/types.js'
import { DataStore } from '../store/dataStore.js'

const router = Router()

interface AppLocals {
  services: {
    quotaService: {
      deductQuota: (
        shipperId: string,
        amount: number,
        reservationId: string,
        operator: string
      ) => Promise<{ success: boolean; message: string; data?: unknown }>
      releaseQuota: (
        shipperId: string,
        amount: number,
        reservationId: string,
        operator: string
      ) => Promise<{ success: boolean; message: string }>
    }
    waitlistService: {
      notifyWaitlistForSlot: (reservation: Reservation) => Promise<unknown>
    }
    operationLogService?: {
      addLog: (params: {
        reservationId: string
        action: 'create' | 'confirm' | 'start_loading' | 'complete' | 'cancel' | 'timeout' | 'assign_workers' | 'waitlist_convert'
        operator: string
        operatorRole?: string
        detail?: string
        beforeStatus?: string
        afterStatus?: string
      }) => unknown
    }
  }
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const store = DataStore.getInstance()
    const { date, startDate, endDate, platformId, status } = req.query

    let reservations = [...store.reservations]

    if (date) {
      const targetDate = new Date(date as string).toDateString()
      reservations = reservations.filter(
        (r) => new Date(r.startTime).toDateString() === targetDate
      )
    }

    if (startDate && endDate) {
      const start = new Date(startDate as string)
      start.setHours(0, 0, 0, 0)
      const end = new Date(endDate as string)
      end.setHours(23, 59, 59, 999)
      reservations = reservations.filter((r) => {
        const rStart = new Date(r.startTime).getTime()
        const rEnd = new Date(r.endTime).getTime()
        return rEnd >= start.getTime() && rStart <= end.getTime()
      })
    }

    if (platformId) {
      reservations = reservations.filter((r) => r.platformId === platformId)
    }

    if (status) {
      const statusList = (status as string).split(',')
      reservations = reservations.filter((r) => statusList.includes(r.status))
    }

    res.json({
      success: true,
      data: reservations,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '获取预约列表失败',
    })
  }
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const store = DataStore.getInstance()
    const { quotaService, operationLogService } = (req.app.locals as AppLocals).services
    const body: CreateReservationReq = req.body

    const {
      platformId,
      shipperId,
      startTime,
      endTime,
      vehicleNo,
      vehicleType,
      cargoType,
      cargoWeight,
      workerIds,
    } = body

    if (
      !platformId ||
      !shipperId ||
      !startTime ||
      !endTime ||
      !vehicleNo ||
      !vehicleType ||
      !cargoType
    ) {
      res.status(400).json({
        success: false,
        message: '缺少必要参数',
      })
      return
    }

    const platform = store.platforms.find((p) => p.id === platformId)
    if (!platform) {
      res.status(400).json({
        success: false,
        message: '月台不存在',
      })
      return
    }

    if (platform.status === 'maintenance') {
      res.status(400).json({
        success: false,
        message: '该月台处于维护状态，无法预约',
      })
      return
    }

    const isTimeOverlap = (
      startA: string,
      endA: string,
      startB: string,
      endB: string
    ): boolean => {
      const sA = new Date(startA).getTime()
      const eA = new Date(endA).getTime()
      const sB = new Date(startB).getTime()
      const eB = new Date(endB).getTime()
      return sA < eB && sB < eA
    }

    const conflictReservation = store.reservations.find(
      (r) =>
        r.platformId === platformId &&
        ['pending', 'confirmed', 'loading'].includes(r.status) &&
        isTimeOverlap(startTime, endTime, r.startTime, r.endTime)
    )

    if (conflictReservation) {
      res.status(400).json({
        success: false,
        message: `该月台此时间段已被占用（状态：${conflictReservation.status}）`,
      })
      return
    }

    const shipper = store.shippers.find((s) => s.id === shipperId)
    if (!shipper) {
      res.status(400).json({
        success: false,
        message: '发货方不存在',
      })
      return
    }

    const reservation: Reservation = {
      id: `r${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
      platformId,
      shipperId,
      startTime,
      endTime,
      vehicleNo,
      vehicleType,
      cargoType,
      cargoWeight: cargoWeight ?? 0,
      status: 'pending',
      workerIds,
      createdAt: new Date().toISOString(),
    }

    const deductResult = await quotaService.deductQuota(
      shipperId,
      1,
      reservation.id,
      'api'
    )

    if (!deductResult.success) {
      res.status(400).json({
        success: false,
        message: deductResult.message,
      })
      return
    }

    store.reservations.push(reservation)
    store.emit('reservations:change', reservation)

    if (operationLogService) {
      operationLogService.addLog({
        reservationId: reservation.id,
        action: 'create',
        operator: 'shipper',
        detail: '创建预约'
      })
    }

    res.json({
      success: true,
      data: reservation,
      message: '预约创建成功',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '创建预约失败',
    })
  }
})

router.put('/:id/confirm', (req: Request, res: Response): void => {
  try {
    const store = DataStore.getInstance()
    const { operationLogService } = (req.app.locals as AppLocals).services
    const { id } = req.params

    const reservation = store.reservations.find((r) => r.id === id)
    if (!reservation) {
      res.status(404).json({
        success: false,
        message: '预约不存在',
      })
      return
    }

    if (reservation.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: `当前状态为 ${reservation.status}，无法确认到港`,
      })
      return
    }

    reservation.status = 'confirmed'
    reservation.arrivedAt = new Date().toISOString()
    store.emit('reservations:change', reservation)

    if (operationLogService) {
      operationLogService.addLog({
        reservationId: reservation.id,
        action: 'confirm',
        operator: 'scheduler',
        detail: '确认到港'
      })
    }

    res.json({
      success: true,
      data: reservation,
      message: '车辆已确认到港',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '确认到港失败',
    })
  }
})

router.put('/:id/complete', async (req: Request, res: Response): Promise<void> => {
  try {
    const store = DataStore.getInstance()
    const { quotaService, waitlistService, operationLogService } = (req.app.locals as AppLocals).services
    const { id } = req.params

    const reservation = store.reservations.find((r) => r.id === id)
    if (!reservation) {
      res.status(404).json({
        success: false,
        message: '预约不存在',
      })
      return
    }

    if (!['confirmed', 'loading'].includes(reservation.status)) {
      res.status(400).json({
        success: false,
        message: `当前状态为 ${reservation.status}，无法完成装卸`,
      })
      return
    }

    reservation.status = 'completed'
    reservation.completedAt = new Date().toISOString()

    if (reservation.workerIds?.length) {
      for (const wid of reservation.workerIds) {
        const worker = store.workers.find((w) => w.id === wid);
        if (worker && worker.status === 'busy') {
          worker.status = 'idle';
          worker.todayTasks += 1;
          store.emit('workers:change', worker);
        }
      }
    }

    const releaseResult = await quotaService.releaseQuota(
      reservation.shipperId,
      1,
      reservation.id,
      'api'
    )

    if (!releaseResult.success) {
      res.status(500).json({
        success: false,
        message: releaseResult.message,
      })
      return
    }

    await waitlistService.notifyWaitlistForSlot(reservation)

    store.emit('reservations:change', reservation)

    if (operationLogService) {
      operationLogService.addLog({
        reservationId: reservation.id,
        action: 'complete',
        operator: 'scheduler',
        detail: '完成装卸'
      })
    }

    res.json({
      success: true,
      data: reservation,
      message: '装卸已完成',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '完成装卸失败',
    })
  }
})

router.put('/:id/cancel', async (req: Request, res: Response): Promise<void> => {
  try {
    const store = DataStore.getInstance()
    const { quotaService, waitlistService, operationLogService } = (req.app.locals as AppLocals).services
    const { id } = req.params

    const reservation = store.reservations.find((r) => r.id === id)
    if (!reservation) {
      res.status(404).json({
        success: false,
        message: '预约不存在',
      })
      return
    }

    if (reservation.status === 'completed' || reservation.status === 'cancelled') {
      res.status(400).json({
        success: false,
        message: `当前状态为 ${reservation.status}，无法取消`,
      })
      return
    }

    reservation.status = 'cancelled'

    if (reservation.workerIds?.length) {
      for (const wid of reservation.workerIds) {
        const worker = store.workers.find((w) => w.id === wid);
        if (worker && worker.status === 'busy') {
          worker.status = 'idle';
          store.emit('workers:change', worker);
        }
      }
    }

    const releaseResult = await quotaService.releaseQuota(
      reservation.shipperId,
      1,
      reservation.id,
      'api'
    )

    if (!releaseResult.success) {
      res.status(500).json({
        success: false,
        message: releaseResult.message,
      })
      return
    }

    await waitlistService.notifyWaitlistForSlot(reservation)

    store.emit('reservations:change', reservation)

    if (operationLogService) {
      operationLogService.addLog({
        reservationId: reservation.id,
        action: 'cancel',
        operator: 'scheduler',
        detail: '取消预约'
      })
    }

    res.json({
      success: true,
      data: reservation,
      message: '预约已取消',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '取消预约失败',
    })
  }
})

router.put('/:id/assign', (req: Request, res: Response): void => {
  try {
    const store = DataStore.getInstance()
    const { operationLogService } = (req.app.locals as AppLocals).services
    const { id } = req.params
    const { workerIds } = req.body as { workerIds: string[] }

    if (!Array.isArray(workerIds)) {
      res.status(400).json({
        success: false,
        message: 'workerIds 必须是数组',
      })
      return
    }

    const reservation = store.reservations.find((r) => r.id === id)
    if (!reservation) {
      res.status(404).json({
        success: false,
        message: '预约不存在',
      })
      return
    }

    if (reservation.status === 'completed' || reservation.status === 'cancelled') {
      res.status(400).json({
        success: false,
        message: `当前状态为 ${reservation.status}，无法指派装卸工`,
      })
      return
    }

    for (const wid of workerIds) {
      const worker = store.workers.find((w) => w.id === wid)
      if (!worker) {
        res.status(400).json({
          success: false,
          message: `装卸工 ${wid} 不存在`,
        })
        return
      }
    }

    reservation.workerIds = workerIds

    const wasLoading = reservation.status === 'loading'
    if (reservation.status === 'confirmed') {
      reservation.status = 'loading'
    }

    for (const wid of workerIds) {
      const worker = store.workers.find((w) => w.id === wid);
      if (worker && worker.status !== 'leave') {
        worker.status = 'busy';
        store.emit('workers:change', worker);
      }
    }

    store.emit('reservations:change', reservation)

    if (operationLogService) {
      const workerNames = workerIds
        .map((wid) => store.workers.find((w) => w.id === wid)?.name || wid)
        .join(', ')
      operationLogService.addLog({
        reservationId: reservation.id,
        action: 'assign_workers',
        operator: 'scheduler',
        detail: `指派了${workerIds.length}名工人：${workerNames}`
      })
      if (!wasLoading && reservation.status === 'loading') {
        operationLogService.addLog({
          reservationId: reservation.id,
          action: 'start_loading',
          operator: 'scheduler',
          detail: '开始装卸作业'
        })
      }
    }

    res.json({
      success: true,
      data: reservation,
      message: '装卸工指派成功',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '指派装卸工失败',
    })
  }
})

export default router
