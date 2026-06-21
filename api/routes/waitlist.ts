import { Router, type Request, type Response } from 'express'
import type { WaitlistItem } from '../../shared/types.js'

const router = Router()

interface AppLocals {
  services: {
    waitlistService: {
      getWaitlist: (sortByPriority?: boolean) => WaitlistItem[]
      addToWaitlist: (data: {
        shipperId: string
        targetDate: string
        priority: 1 | 2 | 3 | 4 | 5
        vehicleNo: string
        vehicleType: string
        cargoType: string
      }) => { success: boolean; message: string; data?: WaitlistItem }
      confirmWaitlistItem: (
        waitlistId: string
      ) => Promise<{ success: boolean; message: string; reservation?: unknown }>
      skipWaitlistItem: (
        waitlistId: string,
        skipReason: string
      ) => { success: boolean; message: string; nextItem?: WaitlistItem | null }
      cancelWaitlistItem: (waitlistId: string) => { success: boolean; message: string }
    }
    operationLogService?: {
      addLog: (
        reservationId: string,
        action: string,
        operator: string,
        detail?: string
      ) => unknown
    }
  }
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const { waitlistService } = (req.app.locals as AppLocals).services
    const { sort } = req.query
    const sortByPriority = sort !== 'false'

    res.json({
      success: true,
      data: waitlistService.getWaitlist(sortByPriority),
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '获取候补列表失败',
    })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { waitlistService } = (req.app.locals as AppLocals).services
    const { shipperId, targetDate, priority, vehicleNo, vehicleType, cargoType } =
      req.body

    if (!shipperId || !targetDate || !vehicleNo || !vehicleType || !cargoType) {
      res.status(400).json({
        success: false,
        message: '缺少必要参数',
      })
      return
    }

    const priorityNum = (priority ?? 3) as 1 | 2 | 3 | 4 | 5
    if (![1, 2, 3, 4, 5].includes(priorityNum)) {
      res.status(400).json({
        success: false,
        message: 'priority 必须是 1-5 之间的整数',
      })
      return
    }

    const result = waitlistService.addToWaitlist({
      shipperId,
      targetDate,
      priority: priorityNum,
      vehicleNo,
      vehicleType,
      cargoType,
    })

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message,
      })
      return
    }

    res.json({
      success: true,
      data: result.data,
      message: result.message,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '登记候补失败',
    })
  }
})

router.put('/:id/confirm', async (req: Request, res: Response): Promise<void> => {
  try {
    const { waitlistService, operationLogService } = (req.app.locals as AppLocals).services
    const { id } = req.params

    const result = await waitlistService.confirmWaitlistItem(id)

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message,
      })
      return
    }

    if (result.reservation && operationLogService) {
      const reservation = result.reservation as { id: string }
      operationLogService.addLog(
        reservation.id,
        'waitlist_convert',
        'scheduler',
        '候补确认转正式预约'
      )
    }

    res.json({
      success: true,
      data: result.reservation,
      message: result.message,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '候补确认失败',
    })
  }
})

router.put('/:id/skip', (req: Request, res: Response): void => {
  try {
    const { waitlistService } = (req.app.locals as AppLocals).services
    const { id } = req.params
    const { skipReason } = req.body as { skipReason: string }

    if (!skipReason) {
      res.status(400).json({
        success: false,
        message: '缺少必要参数：skipReason',
      })
      return
    }

    const result = waitlistService.skipWaitlistItem(id, skipReason)

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message,
      })
      return
    }

    res.json({
      success: true,
      data: { nextItem: result.nextItem },
      message: result.message,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '跳过候补失败',
    })
  }
})

router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const { waitlistService } = (req.app.locals as AppLocals).services
    const { id } = req.params

    const result = waitlistService.cancelWaitlistItem(id)

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message,
      })
      return
    }

    res.json({
      success: true,
      message: result.message,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '取消候补失败',
    })
  }
})

export default router
