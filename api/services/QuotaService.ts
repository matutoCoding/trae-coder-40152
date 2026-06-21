import type { QuotaLog, Shipper } from '../../shared/types.js';
import { DataStore } from '../store/dataStore.js';
import { LockManager } from './LockManager.js';

export interface QuotaInfo {
  quota: number;
  used: number;
  frozen: number;
  available: number;
}

export interface ShipperQuotaInfo extends QuotaInfo {
  id: string;
  name: string;
}

export interface TotalStats {
  totalQuota: number;
  totalUsed: number;
  totalFrozen: number;
  totalAvailable: number;
  shippers: ShipperQuotaInfo[];
}

export class QuotaService {
  private store: DataStore;
  private lockManager: LockManager;

  constructor(store: DataStore, lockManager: LockManager) {
    this.store = store;
    this.lockManager = lockManager;
  }

  getAvailableQuota(shipperId: string): QuotaInfo {
    const shipper = this.store.shippers.find((s) => s.id === shipperId);
    if (!shipper) {
      return { quota: 0, used: 0, frozen: 0, available: 0 };
    }
    const available = shipper.quota - shipper.usedQuota - shipper.frozenQuota;
    return {
      quota: shipper.quota,
      used: shipper.usedQuota,
      frozen: shipper.frozenQuota,
      available: Math.max(0, available),
    };
  }

  async deductQuota(
    shipperId: string,
    amount: number,
    reservationId: string,
    operator: string
  ): Promise<{ success: boolean; message: string; data?: QuotaInfo }> {
    const lockKey = `quota:${shipperId}`;
    const acquired = await this.lockManager.acquireLock(lockKey);

    if (!acquired) {
      return { success: false, message: '额度服务繁忙，请稍后重试' };
    }

    try {
      const shipper = this.store.shippers.find((s) => s.id === shipperId);
      if (!shipper) {
        return { success: false, message: '发货方不存在' };
      }

      const quotaInfo = this.getAvailableQuota(shipperId);
      if (quotaInfo.available < amount) {
        return {
          success: false,
          message: `可用额度不足，剩余可用 ${quotaInfo.available}，需要 ${amount}`,
        };
      }

      shipper.usedQuota += amount;
      this.store.addQuotaLog(shipperId, amount, 'deduct', reservationId, operator);
      this.store.emit('shippers:change');

      return {
        success: true,
        message: '额度扣减成功',
        data: this.getAvailableQuota(shipperId),
      };
    } finally {
      this.lockManager.releaseLock(lockKey);
    }
  }

  async releaseQuota(
    shipperId: string,
    amount: number,
    reservationId: string,
    operator: string
  ): Promise<{ success: boolean; message: string }> {
    const lockKey = `quota:${shipperId}`;
    const acquired = await this.lockManager.acquireLock(lockKey);

    if (!acquired) {
      return { success: false, message: '额度服务繁忙，请稍后重试' };
    }

    try {
      const shipper = this.store.shippers.find((s) => s.id === shipperId);
      if (!shipper) {
        return { success: false, message: '发货方不存在' };
      }

      shipper.usedQuota = Math.max(0, shipper.usedQuota - amount);
      this.store.addQuotaLog(shipperId, amount, 'release', reservationId, operator);
      this.store.emit('shippers:change');

      return { success: true, message: '额度释放成功' };
    } finally {
      this.lockManager.releaseLock(lockKey);
    }
  }

  getTotalStats(): TotalStats {
    const shippers = this.store.shippers.map((shipper) => {
      const quotaInfo = this.getAvailableQuota(shipper.id);
      return {
        id: shipper.id,
        name: shipper.name,
        ...quotaInfo,
      };
    });

    const totalQuota = shippers.reduce((sum, s) => sum + s.quota, 0);
    const totalUsed = shippers.reduce((sum, s) => sum + s.used, 0);
    const totalFrozen = shippers.reduce((sum, s) => sum + s.frozen, 0);
    const totalAvailable = Math.max(0, totalQuota - totalUsed - totalFrozen);

    return {
      totalQuota,
      totalUsed,
      totalFrozen,
      totalAvailable,
      shippers,
    };
  }

  updateShipperQuota(
    shipperId: string,
    newQuota: number
  ): { success: boolean; message: string } {
    if (newQuota < 0) {
      return { success: false, message: '额度不能为负数' };
    }

    const shipper = this.store.shippers.find((s) => s.id === shipperId);
    if (!shipper) {
      return { success: false, message: '发货方不存在' };
    }

    const minQuota = shipper.usedQuota + shipper.frozenQuota;
    if (newQuota < minQuota) {
      return {
        success: false,
        message: `新额度不能低于已使用+冻结额度(${minQuota})`,
      };
    }

    shipper.quota = newQuota;
    this.store.emit('shippers:change');

    return { success: true, message: '额度更新成功' };
  }

  getQuotaLogs(limit?: number): QuotaLog[] {
    const logs = [...this.store.quotaLogs];
    return limit ? logs.slice(0, limit) : logs;
  }
}
