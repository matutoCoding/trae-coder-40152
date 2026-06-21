import type {
  Platform,
  Shipper,
  Reservation,
  WaitlistItem,
  Worker,
  QuotaLog,
  SystemSettings,
  OperationLog,
  QuotaAdjustment,
} from '../../shared/types.js';
import {
  platforms as mockPlatforms,
  shippers as mockShippers,
  reservations as mockReservations,
  waitlist as mockWaitlist,
  workers as mockWorkers,
  quotaLogs as mockQuotaLogs,
  settings as mockSettings,
  operationLogs as mockOperationLogs,
  quotaAdjustments as mockQuotaAdjustments,
} from '../../shared/mockData.js';

type EventCallback = (data?: unknown) => void;

type EventName =
  | 'platforms:change'
  | 'shippers:change'
  | 'reservations:change'
  | 'waitlist:change'
  | 'workers:change'
  | 'quotaLogs:change'
  | 'settings:change'
  | 'operationLogs:change'
  | 'quotaAdjustments:change';

export class DataStore {
  private static instance: DataStore | null = null;

  platforms: Platform[];
  shippers: Shipper[];
  reservations: Reservation[];
  waitlist: WaitlistItem[];
  workers: Worker[];
  quotaLogs: QuotaLog[];
  operationLogs: OperationLog[];
  quotaAdjustments: QuotaAdjustment[];
  settings: SystemSettings;

  private listeners: Map<EventName, Set<EventCallback>> = new Map();

  private constructor() {
    this.platforms = JSON.parse(JSON.stringify(mockPlatforms));
    this.shippers = JSON.parse(JSON.stringify(mockShippers));
    this.reservations = JSON.parse(JSON.stringify(mockReservations));
    this.waitlist = JSON.parse(JSON.stringify(mockWaitlist));
    this.workers = JSON.parse(JSON.stringify(mockWorkers));
    this.quotaLogs = JSON.parse(JSON.stringify(mockQuotaLogs));
    this.operationLogs = JSON.parse(JSON.stringify(mockOperationLogs));
    this.quotaAdjustments = JSON.parse(JSON.stringify(mockQuotaAdjustments));
    this.settings = JSON.parse(JSON.stringify(mockSettings));
  }

  static getInstance(): DataStore {
    if (!DataStore.instance) {
      DataStore.instance = new DataStore();
    }
    return DataStore.instance;
  }

  on(event: EventName, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event: EventName, data?: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const cb of callbacks) {
        try {
          cb(data);
        } catch (err) {
          console.error(`[DataStore] Event listener error for ${event}:`, err);
        }
      }
    }
  }

  addQuotaLog(
    shipperId: string,
    amount: number,
    type: QuotaLog['type'],
    reservationId?: string,
    operator: string = 'system',
    extra?: {
      adjustmentId?: string;
      applicant?: string;
      approver?: string;
      beforeBalance?: number;
      afterBalance?: number;
    }
  ): QuotaLog {
    const log: QuotaLog = {
      id: `ql${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
      shipperId,
      amount,
      type,
      reservationId,
      operator,
      createdAt: new Date().toISOString(),
      ...extra,
    };
    this.quotaLogs.unshift(log);
    this.emit('quotaLogs:change', log);
    this.emit('shippers:change');
    return log;
  }
}
