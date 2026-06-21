import { Router, type Request, type Response } from 'express'
import type { Platform } from '../../shared/types.js'
import { DataStore } from '../store/dataStore.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const store = DataStore.getInstance()
    res.json({
      success: true,
      data: store.platforms,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '获取月台列表失败',
    })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const store = DataStore.getInstance()
    const { code, name, type, weightLimit, status } = req.body

    if (!code || !name || !type) {
      res.status(400).json({
        success: false,
        message: '缺少必要参数：code, name, type',
      })
      return
    }

    const existing = store.platforms.find((p) => p.code === code)
    if (existing) {
      res.status(400).json({
        success: false,
        message: '月台编号已存在',
      })
      return
    }

    const platform: Platform = {
      id: `p${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
      code,
      name,
      type,
      weightLimit: weightLimit ?? 0,
      status: status ?? 'active',
      createdAt: new Date().toISOString(),
    }

    store.platforms.push(platform)
    store.emit('platforms:change', platform)

    res.json({
      success: true,
      data: platform,
      message: '月台创建成功',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '创建月台失败',
    })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const store = DataStore.getInstance()
    const { id } = req.params
    const { code, name, type, weightLimit, status } = req.body

    const platform = store.platforms.find((p) => p.id === id)
    if (!platform) {
      res.status(404).json({
        success: false,
        message: '月台不存在',
      })
      return
    }

    if (code && code !== platform.code) {
      const existing = store.platforms.find((p) => p.code === code)
      if (existing) {
        res.status(400).json({
          success: false,
          message: '月台编号已存在',
        })
        return
      }
      platform.code = code
    }

    if (name !== undefined) platform.name = name
    if (type !== undefined) platform.type = type
    if (weightLimit !== undefined) platform.weightLimit = weightLimit
    if (status !== undefined) platform.status = status

    store.emit('platforms:change', platform)

    res.json({
      success: true,
      data: platform,
      message: '月台更新成功',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '更新月台失败',
    })
  }
})

router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const store = DataStore.getInstance()
    const { id } = req.params

    const index = store.platforms.findIndex((p) => p.id === id)
    if (index === -1) {
      res.status(404).json({
        success: false,
        message: '月台不存在',
      })
      return
    }

    const hasActiveReservations = store.reservations.some(
      (r) => r.platformId === id && ['pending', 'confirmed', 'loading'].includes(r.status)
    )
    if (hasActiveReservations) {
      res.status(400).json({
        success: false,
        message: '该月台存在进行中的预约，无法删除',
      })
      return
    }

    const [deleted] = store.platforms.splice(index, 1)
    store.emit('platforms:change', deleted)

    res.json({
      success: true,
      message: '月台删除成功',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '删除月台失败',
    })
  }
})

export default router
