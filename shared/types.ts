export interface Platform {
  id: string;
  code: string;
  name: string;
  type: 'unload' | 'load' | 'mixed';
  weightLimit: number;
  status: 'active' | 'maintenance';
  createdAt: string;
}

export interface Shipper {
  id: string;
  name: string;
  quota: number;
  used: number;
  frozen: number;
  available: number;
}

export interface QuotaOverview {
  totalQuota: number;
  totalUsed: number;
  totalFrozen: number;
  totalAvailable: number;
  shippers: Shipper[];
}

export interface Reservation {
  id: string;
  platformId: string;
  shipperId: string;
  startTime: string;
  endTime: string;
  vehicleNo: string;
  vehicleType: string;
  cargoType: string;
  cargoWeight: number;
  status: 'pending' | 'confirmed' | 'loading' | 'completed' | 'cancelled' | 'timeout';
  arrivedAt?: string;
  completedAt?: string;
  workerIds?: string[];
  createdAt: string;
}

export interface WaitlistItem {
  id: string;
  shipperId: string;
  targetDate: string;
  priority: 1 | 2 | 3 | 4 | 5;
  vehicleNo: string;
  vehicleType: string;
  cargoType: string;
  status: 'waiting' | 'notified' | 'confirmed' | 'cancelled' | 'converted' | 'skipped';
  slotId?: string;
  notifiedAt?: string;
  convertedReservationId?: string;
  notifiedReservationId?: string;
  releasedPlatformId?: string;
  releasedStartTime?: string;
  releasedEndTime?: string;
  skipReason?: string;
  skippedAt?: string;
  createdAt: string;
}

export interface Worker {
  id: string;
  name: string;
  group: string;
  status: 'idle' | 'busy' | 'leave';
  todayTasks: number;
}

export interface QuotaLog {
  id: string;
  shipperId: string;
  amount: number;
  type: 'deduct' | 'release' | 'freeze' | 'unfreeze' | 'adjust';
  reservationId?: string;
  adjustmentId?: string;
  applicant?: string;
  approver?: string;
  beforeBalance?: number;
  afterBalance?: number;
  operator: string;
  createdAt: string;
}

export interface SystemSettings {
  timeoutMinutes: number;
  waitlistConfirmMinutes: number;
  totalQuota: number;
}

export interface CreateReservationReq {
  platformId: string;
  shipperId: string;
  startTime: string;
  endTime: string;
  vehicleNo: string;
  vehicleType: string;
  cargoType: string;
  cargoWeight: number;
  workerIds?: string[];
}

export interface OperationLog {
  id: string;
  reservationId: string;
  action: 'create' | 'confirm' | 'start_loading' | 'complete' | 'cancel' | 'timeout' | 'assign_workers' | 'waitlist_convert';
  actionLabel: string;
  operator: string;
  operatorRole: 'admin' | 'system' | 'shipper' | 'scheduler';
  detail?: string;
  beforeStatus?: string;
  afterStatus?: string;
  createdAt: string;
}

export interface QuotaAdjustment {
  id: string;
  shipperId: string;
  type: 'increase' | 'decrease';
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  applicant: string;
  applicantRole: string;
  approver?: string;
  approverRole?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectReason?: string;
  beforeQuota: number;
  afterQuota?: number;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: number;
}
