import { Router, type Request, type Response } from 'express'
import type { OperationLog } from '../../shared/types.js'

const router = Router()

interface AppLocals {
  services: {
    operationLogService?: {
      getLogsByReservation: (reservationId: string) => OperationLog[]
    }
  }
}

router.get('/:reservationId', (req: Request, res: Response): void => {
  try {
    const { operationLogService } = (req.app.locals as AppLocals).services
    const { reservationId } = req.params

    if (!operationLogService) {
      res.status(500).json({
        success: false,
        message: '操作日志服务未初始化',
      })
      return
    }

    const logs = operationLogService.getLogsByReservation(reservationId)

    res.json({
      success: true,
      data: logs,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '获取操作日志失败',
    })
  }
})

export default router
