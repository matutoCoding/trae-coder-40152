import type { OperationLog } from '../../shared/types.js';
import { DataStore } from '../store/dataStore.js';

const ACTION_LABEL_MAP: Record<OperationLog['action'], string> = {
  create: '创建预约',
  confirm: '车辆到港确认',
  start_loading: '开始装卸',
  complete: '装卸完成',
  cancel: '取消预约',
  timeout: '超时自动释放',
  assign_workers: '指派装卸工',
  waitlist_convert: '候补转正',
};

export class OperationLogService {
  private store: DataStore;

  constructor(store: DataStore) {
    this.store = store;
  }

  addLog(params: {
    reservationId: string;
    action: OperationLog['action'];
    operator: string;
    operatorRole?: string;
    detail?: string;
    beforeStatus?: string;
    afterStatus?: string;
  }): OperationLog {
    const log: OperationLog = {
      id: `ol${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
      reservationId: params.reservationId,
      action: params.action,
      actionLabel: ACTION_LABEL_MAP[params.action],
      operator: params.operator,
      operatorRole: (params.operatorRole ?? 'system') as OperationLog['operatorRole'],
      detail: params.detail,
      beforeStatus: params.beforeStatus,
      afterStatus: params.afterStatus,
      createdAt: new Date().toISOString(),
    };

    this.store.operationLogs.unshift(log);
    this.store.emit('operationLogs:change', log);

    return log;
  }

  getLogsByReservation(reservationId: string): OperationLog[] {
    return this.store.operationLogs
      .filter((log) => log.reservationId === reservationId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}
