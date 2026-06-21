import { Router, type Request, type Response } from 'express'
import type { QuotaAdjustment } from '../../shared/types.js'

const router = Router()

interface AppLocals {
  services: {
    quotaApprovalService?: {
      getApplications: (status?: string, shipperId?: string) => QuotaAdjustment[]
      submitApplication: (data: {
        shipperId: string
        type: 'increase' | 'decrease'
        amount: number
        reason: string
        applicant: string
      }) => { success: boolean; message: string; data?: QuotaAdjustment }
      approve: (
        id: string,
        approver: string,
        approverRole?: string
      ) => Promise<{ success: boolean; message: string; data?: QuotaAdjustment }>
      reject: (
        id: string,
        approver: string,
        rejectReason: string,
        approverRole?: string
      ) => { success: boolean; message: string; data?: QuotaAdjustment }
    }
  }
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const { quotaApprovalService } = (req.app.locals as AppLocals).services
    const { status, shipperId } = req.query

    if (!quotaApprovalService) {
      res.status(500).json({
        success: false,
        message: '额度审批服务未初始化',
      })
      return
    }

    const adjustments = quotaApprovalService.getApplications(
      status as string | undefined,
      shipperId as string | undefined
    )

    res.json({
      success: true,
      data: adjustments,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '获取额度调整申请列表失败',
    })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { quotaApprovalService } = (req.app.locals as AppLocals).services
    const { shipperId, type, amount, reason, applicant } = req.body

    if (!quotaApprovalService) {
      res.status(500).json({
        success: false,
        message: '额度审批服务未初始化',
      })
      return
    }

    if (!shipperId || !type || !amount || !reason || !applicant) {
      res.status(400).json({
        success: false,
        message: '缺少必要参数：shipperId, type, amount, reason, applicant',
      })
      return
    }

    if (type !== 'increase' && type !== 'decrease') {
      res.status(400).json({
        success: false,
        message: 'type 必须是 increase 或 decrease',
      })
      return
    }

    if (typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({
        success: false,
        message: 'amount 必须是大于 0 的数字',
      })
      return
    }

    const result = quotaApprovalService.submitApplication({
      shipperId,
      type,
      amount,
      reason,
      applicant,
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
      message: error instanceof Error ? error.message : '提交额度调整申请失败',
    })
  }
})

router.put('/:id/approve', async (req: Request, res: Response): Promise<void> => {
  try {
    const { quotaApprovalService } = (req.app.locals as AppLocals).services
    const { id } = req.params
    const { approver, approverRole } = req.body

    if (!quotaApprovalService) {
      res.status(500).json({
        success: false,
        message: '额度审批服务未初始化',
      })
      return
    }

    if (!approver) {
      res.status(400).json({
        success: false,
        message: '缺少必要参数：approver',
      })
      return
    }

    const result = await quotaApprovalService.approve(id, approver, approverRole)

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
      message: error instanceof Error ? error.message : '审批通过失败',
    })
  }
})

router.put('/:id/reject', (req: Request, res: Response): void => {
  try {
    const { quotaApprovalService } = (req.app.locals as AppLocals).services
    const { id } = req.params
    const { approver, rejectReason, approverRole } = req.body

    if (!quotaApprovalService) {
      res.status(500).json({
        success: false,
        message: '额度审批服务未初始化',
      })
      return
    }

    if (!approver || !rejectReason) {
      res.status(400).json({
        success: false,
        message: '缺少必要参数：approver, rejectReason',
      })
      return
    }

    const result = quotaApprovalService.reject(
      id,
      approver,
      rejectReason,
      approverRole
    )

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
      message: error instanceof Error ? error.message : '审批拒绝失败',
    })
  }
})

export default router
