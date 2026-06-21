import { Router, type Request, type Response } from 'express'
import type { Worker } from '../../shared/types.js'
import { DataStore } from '../store/dataStore.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const store = DataStore.getInstance()
    res.json({
      success: true,
      data: store.workers,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '获取装卸工列表失败',
    })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const store = DataStore.getInstance()
    const { name, group, status } = req.body

    if (!name) {
      res.status(400).json({
        success: false,
        message: '缺少必要参数：name',
      })
      return
    }

    const worker: Worker = {
      id: `w${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
      name,
      group: group ?? '',
      status: status ?? 'idle',
      todayTasks: 0,
    }

    store.workers.push(worker)
    store.emit('workers:change', worker)

    res.json({
      success: true,
      data: worker,
      message: '装卸工创建成功',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '创建装卸工失败',
    })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const store = DataStore.getInstance()
    const { id } = req.params
    const { name, group, status, todayTasks } = req.body

    const worker = store.workers.find((w) => w.id === id)
    if (!worker) {
      res.status(404).json({
        success: false,
        message: '装卸工不存在',
      })
      return
    }

    if (name !== undefined) worker.name = name
    if (group !== undefined) worker.group = group
    if (status !== undefined) {
      if (!['idle', 'busy', 'leave'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'status 必须是 idle、busy 或 leave',
        })
        return
      }
      worker.status = status
    }
    if (todayTasks !== undefined) {
      if (typeof todayTasks !== 'number' || todayTasks < 0) {
        res.status(400).json({
          success: false,
          message: 'todayTasks 必须是非负数字',
        })
        return
      }
      worker.todayTasks = todayTasks
    }

    store.emit('workers:change', worker)

    res.json({
      success: true,
      data: worker,
      message: '装卸工信息更新成功',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '更新装卸工信息失败',
    })
  }
})

export default router
