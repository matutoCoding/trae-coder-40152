import type { Reservation, WaitlistItem } from '../../shared/types.js';
import { DataStore } from '../store/dataStore.js';
import { QuotaService } from './QuotaService.js';

export interface AddWaitlistData {
  shipperId: string;
  targetDate: string;
  priority: 1 | 2 | 3 | 4 | 5;
  vehicleNo: string;
  vehicleType: string;
  cargoType: string;
}

export class WaitlistService {
  private store: DataStore;
  private quotaService: QuotaService;

  constructor(store: DataStore, quotaService: QuotaService) {
    this.store = store;
    this.quotaService = quotaService;
  }

  addToWaitlist(
    data: AddWaitlistData
  ): { success: boolean; message: string; data?: WaitlistItem } {
    const shipper = this.store.shippers.find((s) => s.id === data.shipperId);
    if (!shipper) {
      return { success: false, message: '发货方不存在' };
    }

    const quotaInfo = this.quotaService.getAvailableQuota(data.shipperId);
    if (quotaInfo.available <= 0) {
      return { success: false, message: '没有可用额度，无法加入候补' };
    }

    const item: WaitlistItem = {
      id: `wl${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
      shipperId: data.shipperId,
      targetDate: data.targetDate,
      priority: data.priority,
      vehicleNo: data.vehicleNo,
      vehicleType: data.vehicleType,
      cargoType: data.cargoType,
      status: 'waiting',
      createdAt: new Date().toISOString(),
    };

    this.store.waitlist.push(item);
    this.store.emit('waitlist:change', item);

    return { success: true, message: '成功加入候补队列', data: item };
  }

  getWaitlist(sortByPriority: boolean = true): WaitlistItem[] {
    const items = [...this.store.waitlist];
    if (sortByPriority) {
      items.sort((a, b) => b.priority - a.priority || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return items;
  }

  async notifyWaitlistForSlot(
    releasedReservation: Reservation
  ): Promise<WaitlistItem | null> {
    const releasedDate = new Date(releasedReservation.startTime).toDateString();
    const waiting = this.getWaitlist(true).filter(
      (item) =>
        item.status === 'waiting' &&
        new Date(item.targetDate).toDateString() === releasedDate
    );

    for (const item of waiting) {
      const quotaInfo = this.quotaService.getAvailableQuota(item.shipperId);
      if (quotaInfo.available <= 0) {
        continue;
      }

      item.status = 'notified';
      item.notifiedAt = new Date().toISOString();
      item.notifiedReservationId = releasedReservation.id;
      item.releasedPlatformId = releasedReservation.platformId;
      item.releasedStartTime = releasedReservation.startTime;
      item.releasedEndTime = releasedReservation.endTime;
      this.store.emit('waitlist:change', item);

      return item;
    }

    return null;
  }

  async confirmWaitlistItem(
    waitlistId: string
  ): Promise<{ success: boolean; message: string; reservation?: Reservation }> {
    const item = this.store.waitlist.find((w) => w.id === waitlistId);
    if (!item) {
      return { success: false, message: '候补记录不存在' };
    }

    if (item.status !== 'notified') {
      return { success: false, message: '该候补状态不是已通知状态，无法确认' };
    }

    const quotaInfo = this.quotaService.getAvailableQuota(item.shipperId);
    if (quotaInfo.available <= 0) {
      return { success: false, message: '可用额度不足' };
    }

    let finalPlatformId = item.releasedPlatformId ?? '';
    let finalStartTime = item.releasedStartTime ?? new Date().toISOString();
    let finalEndTime =
      item.releasedEndTime ??
      new Date(Date.now() + 90 * 60 * 1000).toISOString();

    if (item.notifiedReservationId && !finalPlatformId) {
      const releasedRes = this.store.reservations.find(
        (r) => r.id === item.notifiedReservationId
      );
      if (releasedRes) {
        finalPlatformId = releasedRes.platformId;
        finalStartTime = releasedRes.startTime;
        finalEndTime = releasedRes.endTime;
      }
    }

    const reservation: Reservation = {
      id: `r${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
      platformId: finalPlatformId,
      shipperId: item.shipperId,
      startTime: finalStartTime,
      endTime: finalEndTime,
      vehicleNo: item.vehicleNo,
      vehicleType: item.vehicleType,
      cargoType: item.cargoType,
      cargoWeight: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const deductResult = await this.quotaService.deductQuota(
      item.shipperId,
      1,
      reservation.id,
      'waitlist'
    );

    if (!deductResult.success) {
      return { success: false, message: deductResult.message };
    }

    item.status = 'converted';
    item.convertedReservationId = reservation.id;
    this.store.reservations.push(reservation);
    this.store.emit('waitlist:change', item);
    this.store.emit('reservations:change', reservation);

    return {
      success: true,
      message: '候补确认成功，已转为正式预约',
      reservation,
    };
  }

  cancelWaitlistItem(
    waitlistId: string
  ): { success: boolean; message: string } {
    const item = this.store.waitlist.find((w) => w.id === waitlistId);
    if (!item) {
      return { success: false, message: '候补记录不存在' };
    }

    if (item.status === 'converted' || item.status === 'confirmed') {
      return { success: false, message: '该候补已处理，无法取消' };
    }

    item.status = 'cancelled';
    this.store.emit('waitlist:change', item);

    return { success: true, message: '候补已取消' };
  }
}
