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
  usedQuota: number;
  frozenQuota: number;
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
  status: 'waiting' | 'notified' | 'confirmed' | 'cancelled' | 'converted';
  notifiedAt?: string;
  convertedReservationId?: string;
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
  type: 'deduct' | 'release' | 'freeze' | 'unfreeze';
  reservationId?: string;
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: number;
}
