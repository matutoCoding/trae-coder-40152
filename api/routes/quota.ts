import { Router, type Request, type Response } from 'express'
import type { QuotaLog } from '../../shared/types.js'

const router = Router()

interface AppLocals {
  services: {
    quotaService: {
      getTotalStats: () => {
        totalQuota: number
        totalUsed: number
        totalFrozen: number
        totalAvailable: number
        shippers: Array<{
          id: string
          name: string
          quota: number
          used: number
          frozen: number
          available: number
        }>
      }
      updateShipperQuota: (
        shipperId: string,
        newQuota: number
      ) => { success: boolean; message: string }
      getQuotaLogs: (limit?: number) => QuotaLog[]
    }
  }
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const { quotaService } = (req.app.locals as AppLocals).services
    const stats = quotaService.getTotalStats()

    res.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '获取额度概览失败',
    })
  }
})

router.put('/shippers/:id', (req: Request, res: Response): void => {
  try {
    const { quotaService } = (req.app.locals as AppLocals).services
    const { id } = req.params
    const { quota } = req.body as { quota: number }

    if (quota === undefined || quota === null) {
      res.status(400).json({
        success: false,
        message: '缺少 quota 参数',
      })
      return
    }

    if (typeof quota !== 'number' || quota < 0) {
      res.status(400).json({
        success: false,
        message: 'quota 必须是非负数字',
      })
      return
    }

    const result = quotaService.updateShipperQuota(id, quota)

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
      message: error instanceof Error ? error.message : '更新货主配额失败',
    })
  }
})

router.get('/logs', (req: Request, res: Response): void => {
  try {
    const { quotaService } = (req.app.locals as AppLocals).services
    const { limit } = req.query
    const limitNum = limit ? parseInt(limit as string, 10) : undefined

    if (limit !== undefined && (isNaN(limitNum as number) || (limitNum as number) <= 0)) {
      res.status(400).json({
        success: false,
        message: 'limit 必须是正整数',
      })
      return
    }

    const logs = quotaService.getQuotaLogs(limitNum)

    res.json({
      success: true,
      data: logs,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '获取额度流水失败',
    })
  }
})

export default router
