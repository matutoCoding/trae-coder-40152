import { Router, type Request, type Response } from 'express'
import type { SystemSettings } from '../../shared/types.js'
import { DataStore } from '../store/dataStore.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const store = DataStore.getInstance()
    res.json({
      success: true,
      data: store.settings,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '获取系统设置失败',
    })
  }
})

router.put('/', (req: Request, res: Response): void => {
  try {
    const store = DataStore.getInstance()
    const body: Partial<SystemSettings> = req.body
    const { timeoutMinutes, waitlistConfirmMinutes, totalQuota } = body

    if (timeoutMinutes !== undefined) {
      if (typeof timeoutMinutes !== 'number' || timeoutMinutes <= 0) {
        res.status(400).json({
          success: false,
          message: 'timeoutMinutes 必须是正数字',
        })
        return
      }
      store.settings.timeoutMinutes = timeoutMinutes
    }

    if (waitlistConfirmMinutes !== undefined) {
      if (typeof waitlistConfirmMinutes !== 'number' || waitlistConfirmMinutes <= 0) {
        res.status(400).json({
          success: false,
          message: 'waitlistConfirmMinutes 必须是正数字',
        })
        return
      }
      store.settings.waitlistConfirmMinutes = waitlistConfirmMinutes
    }

    if (totalQuota !== undefined) {
      if (typeof totalQuota !== 'number' || totalQuota < 0) {
        res.status(400).json({
          success: false,
          message: 'totalQuota 必须是非负数字',
        })
        return
      }
      store.settings.totalQuota = totalQuota
    }

    store.emit('settings:change', store.settings)

    res.json({
      success: true,
      data: store.settings,
      message: '系统设置更新成功',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '更新系统设置失败',
    })
  }
})

export default router
