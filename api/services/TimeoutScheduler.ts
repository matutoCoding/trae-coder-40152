import type { Reservation } from '../../shared/types.js';
import { DataStore } from '../store/dataStore.js';
import { QuotaService } from './QuotaService.js';
import { WaitlistService } from './WaitlistService.js';
import { OperationLogService } from './OperationLogService.js';

const CHECK_INTERVAL = 30 * 1000;

export class TimeoutScheduler {
  private static instance: TimeoutScheduler | null = null;

  private store: DataStore;
  private quotaService: QuotaService;
  private waitlistService: WaitlistService;
  private operationLogService: OperationLogService;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  private constructor(
    store: DataStore,
    quotaService: QuotaService,
    waitlistService: WaitlistService,
    operationLogService: OperationLogService
  ) {
    this.store = store;
    this.quotaService = quotaService;
    this.waitlistService = waitlistService;
    this.operationLogService = operationLogService;
  }

  static getInstance(
    store: DataStore,
    quotaService: QuotaService,
    waitlistService: WaitlistService,
    operationLogService?: OperationLogService
  ): TimeoutScheduler {
    if (!TimeoutScheduler.instance) {
      if (!operationLogService) {
        throw new Error('OperationLogService is required to initialize TimeoutScheduler');
      }
      TimeoutScheduler.instance = new TimeoutScheduler(
        store,
        quotaService,
        waitlistService,
        operationLogService
      );
    }
    return TimeoutScheduler.instance;
  }

  start(): void {
    if (this.intervalId !== null) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.checkTimeouts().catch((err) => {
        console.error('[TimeoutScheduler] Check timeouts error:', err);
      });
    }, CHECK_INTERVAL);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async checkTimeouts(): Promise<string[]> {
    const timeoutIds: string[] = [];
    const { timeoutMinutes } = this.store.settings;
    const now = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;

    const pendingReservations = this.store.reservations.filter(
      (r) => r.status === 'pending'
    );

    for (const reservation of pendingReservations) {
      const startAt = new Date(reservation.startTime).getTime();
      const deadline = startAt + timeoutMs;
      const isTimeout = now > deadline;

      if (!isTimeout) {
        continue;
      }

      reservation.status = 'timeout';
      timeoutIds.push(reservation.id);

      if (reservation.workerIds?.length) {
        for (const wid of reservation.workerIds) {
          const worker = this.store.workers.find((w) => w.id === wid);
          if (worker && worker.status === 'busy') {
            worker.status = 'idle';
            this.store.emit('workers:change', worker);
          }
        }
      }

      const releaseResult = await this.quotaService.releaseQuota(
        reservation.shipperId,
        1,
        reservation.id,
        'timeout-scheduler'
      );

      if (!releaseResult.success) {
        console.error(
          `[TimeoutScheduler] Failed to release quota for reservation ${reservation.id}:`,
          releaseResult.message
        );
      }

      await this.waitlistService.notifyWaitlistForSlot(reservation);
      this.store.emit('reservations:change', reservation);

      this.operationLogService.addLog({
        reservationId: reservation.id,
        action: 'timeout',
        operator: 'system',
        detail: '超时未到港，自动释放'
      });
    }

    if (timeoutIds.length > 0) {
      console.log(
        `[TimeoutScheduler] Processed ${timeoutIds.length} timed out reservations:`,
        timeoutIds
      );
    }

    this.waitlistService.checkNotifiedTimeouts();

    return timeoutIds;
  }
}
