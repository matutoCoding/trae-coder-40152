import type { QuotaAdjustment } from '../../shared/types.js';
import { DataStore } from '../store/dataStore.js';
import { QuotaService } from './QuotaService.js';
import { LockManager } from './LockManager.js';

export class QuotaApprovalService {
  private store: DataStore;
  private quotaService: QuotaService;
  private lockManager: LockManager;

  constructor(store: DataStore, quotaService: QuotaService) {
    this.store = store;
    this.quotaService = quotaService;
    this.lockManager = new LockManager();
  }

  submitApplication(params: {
    shipperId: string;
    type: 'increase' | 'decrease';
    amount: number;
    reason: string;
    applicant: string;
    applicantRole?: string;
  }): { success: boolean; message: string; data?: QuotaAdjustment } {
    const shipper = this.store.shippers.find((s) => s.id === params.shipperId);
    if (!shipper) {
      return { success: false, message: '发货方不存在' };
    }

    if (params.amount <= 0) {
      return { success: false, message: '调整数量必须大于0' };
    }

    if (params.type === 'decrease') {
      const minQuota = shipper.used + shipper.frozen;
      const newQuota = shipper.quota - params.amount;
      if (newQuota < minQuota) {
        return {
          success: false,
          message: `减额后额度(${newQuota})不能低于已使用+冻结额度(${minQuota})`,
        };
      }
    }

    const adjustment: QuotaAdjustment = {
      id: `qa${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
      shipperId: params.shipperId,
      type: params.type,
      amount: params.amount,
      reason: params.reason,
      status: 'pending',
      applicant: params.applicant,
      applicantRole: params.applicantRole ?? 'shipper',
      beforeQuota: shipper.quota,
      createdAt: new Date().toISOString(),
    };

    this.store.quotaAdjustments.unshift(adjustment);
    this.store.emit('quotaAdjustments:change', adjustment);

    return { success: true, message: '申请提交成功', data: adjustment };
  }

  async approve(
    adjustmentId: string,
    approver: string,
    approverRole?: string
  ): Promise<{ success: boolean; message: string; data?: QuotaAdjustment }> {
    const lockKey = `quota-approval:${adjustmentId}`;
    const acquired = await this.lockManager.acquireLock(lockKey);

    if (!acquired) {
      return { success: false, message: '审批处理中，请稍后重试' };
    }

    try {
      const adjustment = this.store.quotaAdjustments.find((a) => a.id === adjustmentId);
      if (!adjustment) {
        return { success: false, message: '申请记录不存在' };
      }

      if (adjustment.status !== 'pending') {
        return { success: false, message: `该申请状态为${adjustment.status}，无法审批` };
      }

      const shipper = this.store.shippers.find((s) => s.id === adjustment.shipperId);
      if (!shipper) {
        return { success: false, message: '发货方不存在' };
      }

      const beforeBalance = shipper.quota;
      const newQuota = adjustment.type === 'increase'
        ? shipper.quota + adjustment.amount
        : shipper.quota - adjustment.amount;

      const updateResult = this.quotaService.updateShipperQuota(adjustment.shipperId, newQuota);
      if (!updateResult.success) {
        return { success: false, message: updateResult.message };
      }

      adjustment.status = 'approved';
      adjustment.approver = approver;
      adjustment.approverRole = approverRole;
      adjustment.approvedAt = new Date().toISOString();
      adjustment.afterQuota = newQuota;

      this.store.addQuotaLog(
        adjustment.shipperId,
        adjustment.amount,
        'adjust',
        undefined,
        approver,
        {
          adjustmentId: adjustment.id,
          applicant: adjustment.applicant,
          approver,
          beforeBalance,
          afterBalance: newQuota,
        }
      );

      this.store.emit('quotaAdjustments:change', adjustment);

      return { success: true, message: '审批通过', data: adjustment };
    } finally {
      this.lockManager.releaseLock(lockKey);
    }
  }

  reject(
    adjustmentId: string,
    approver: string,
    rejectReason: string,
    approverRole?: string
  ): { success: boolean; message: string; data?: QuotaAdjustment } {
    const adjustment = this.store.quotaAdjustments.find((a) => a.id === adjustmentId);
    if (!adjustment) {
      return { success: false, message: '申请记录不存在' };
    }

    if (adjustment.status !== 'pending') {
      return { success: false, message: `该申请状态为${adjustment.status}，无法审批` };
    }

    adjustment.status = 'rejected';
    adjustment.approver = approver;
    adjustment.approverRole = approverRole;
    adjustment.rejectedAt = new Date().toISOString();
    adjustment.rejectReason = rejectReason;

    this.store.emit('quotaAdjustments:change', adjustment);

    return { success: true, message: '已拒绝申请', data: adjustment };
  }

  getApplications(status?: string, shipperId?: string): QuotaAdjustment[] {
    let result = [...this.store.quotaAdjustments];

    if (status) {
      result = result.filter((a) => a.status === status);
    }

    if (shipperId) {
      result = result.filter((a) => a.shipperId === shipperId);
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}
