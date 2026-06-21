import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Truck,
  Package,
  Clock,
  Check,
  XCircle,
  PlayCircle,
  Users,
  History,
  Filter,
  Download,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { api } from '../lib/api';
import StatusBadge from './StatusBadge';
import type { Reservation, Platform, Shipper, Worker, OperationLog } from '../../shared/types';
import { cn } from '../lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  reservation: Reservation | null;
}

const actionColorMap: Record<OperationLog['action'], string> = {
  create: 'bg-primary-500/10 text-primary-500 border-primary-500/30',
  confirm: 'bg-success/10 text-success border-success/30',
  start_loading: 'bg-accent-500/10 text-accent-500 border-accent-500/30',
  complete: 'bg-success/10 text-success border-success/30',
  cancel: 'bg-neutral-200 text-neutral-600 border-neutral-300',
  timeout: 'bg-danger/10 text-danger border-danger/30',
  assign_workers: 'bg-accent-500/10 text-accent-500 border-accent-500/30',
  waitlist_convert: 'bg-warning/15 text-warning-700 border-warning/40',
};

const actionLabels: Record<OperationLog['action'], string> = {
  create: '创建预约',
  confirm: '车辆到港',
  start_loading: '开始装卸',
  complete: '装卸完成',
  cancel: '取消预约',
  timeout: '超时释放',
  assign_workers: '指派工人',
  waitlist_convert: '候补转正',
};

export default function ReservationDetailModal({ open, onClose, reservation }: Props) {
  const platforms = useAppStore((s) => s.platforms);
  const quotaOverview = useAppStore((s) => s.quotaOverview);
  const workers = useAppStore((s) => s.workers);
  const reservations = useAppStore((s) => s.reservations);
  const pushNotification = useAppStore((s) => s.pushNotification);
  const fetchReservations = useAppStore((s) => s.fetchReservations);
  const fetchWorkers = useAppStore((s) => s.fetchWorkers);
  const fetchQuota = useAppStore((s) => s.fetchQuota);
  const setLoading = useAppStore((s) => s.setLoading);
  const selectedDate = useAppStore((s) => s.selectedDate);

  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [logActionFilter, setLogActionFilter] = useState<'all' | OperationLog['action']>('all');
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
  const [workerGroupFilter, setWorkerGroupFilter] = useState<string>('all');

  useEffect(() => {
    if (open && reservation) {
      setActiveReservation(reservation);
      setSelectedWorkerIds(reservation.workerIds || []);
      setLogActionFilter('all');
      setWorkerGroupFilter('all');
      fetchLogs(reservation.id);
    } else if (!open) {
      setActiveReservation(null);
    }
  }, [open, reservation]);

  const fetchLogs = async (reservationId: string) => {
    try {
      const res = await api.operationLogs.getByReservation(reservationId);
      if (res.success && res.data) {
        setLogs(
          res.data.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
      }
    } catch (e) {
      console.error('Failed to fetch operation logs', e);
    }
  };

  const refreshAll = async () => {
    if (!activeReservation) return;
    const id = activeReservation.id;
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - 3);
    const end = new Date(selectedDate);
    end.setDate(end.getDate() + 3);
    await Promise.all([
      fetchReservations({
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      }),
      fetchWorkers(),
      fetchQuota(),
    ]);
    setActiveReservation((prev) => {
      if (!prev) return null;
      const latest = useAppStore.getState().reservations.find((r) => r.id === id);
      return latest || prev;
    });
    fetchLogs(id);
  };

  if (!open || !activeReservation) return null;

  const platform: Platform | undefined = platforms.find(
    (p: Platform) => p.id === activeReservation.platformId
  );
  const shippers: Shipper[] = quotaOverview?.shippers || [];
  const shipper: Shipper | undefined = shippers.find(
    (s: Shipper) => s.id === activeReservation.shipperId
  );

  const groups = useMemo(() => {
    const set = new Set(workers.map((w) => w.group));
    return Array.from(set).sort();
  }, [workers]);

  const workerOccupancyMap = useMemo(() => {
    const map: Record<string, { reservationId: string; vehicleNo: string }[]> = {};
    const currStart = new Date(activeReservation.startTime).getTime();
    const currEnd = new Date(activeReservation.endTime).getTime();
    reservations.forEach((r) => {
      if (r.id === activeReservation.id) return;
      if (['completed', 'cancelled', 'timeout'].includes(r.status)) return;
      if (!r.workerIds?.length) return;
      const rStart = new Date(r.startTime).getTime();
      const rEnd = new Date(r.endTime).getTime();
      const overlap = currStart < rEnd && rStart < currEnd;
      if (!overlap) return;
      r.workerIds.forEach((wid) => {
        if (!map[wid]) map[wid] = [];
        map[wid].push({ reservationId: r.id, vehicleNo: r.vehicleNo });
      });
    });
    return map;
  }, [reservations, activeReservation]);

  const assignableWorkers = useMemo(() => {
    let list = workers;
    if (workerGroupFilter !== 'all') {
      list = list.filter((w) => w.group === workerGroupFilter);
    }
    return list.map((w) => {
      const occupancy = workerOccupancyMap[w.id] || [];
      const isOccupied = occupancy.length > 0;
      const isAssigned = (activeReservation.workerIds || []).includes(w.id);
      const isLeave = w.status === 'leave';
      return {
        worker: w,
        occupancy,
        isOccupied,
        isAssigned,
        isLeave,
        isDisabled: isOccupied && !isAssigned,
      };
    });
  }, [workers, workerGroupFilter, workerOccupancyMap, activeReservation]);

  const filteredLogs = useMemo(() => {
    if (logActionFilter === 'all') return logs;
    return logs.filter((l) => l.action === logActionFilter);
  }, [logs, logActionFilter]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTimeOnly = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  };

  const handleConfirm = async () => {
    setLoading('confirmReservation', true);
    const res = await api.reservations.confirm(activeReservation.id);
    setLoading('confirmReservation', false);
    if (res.success) {
      pushNotification({
        type: 'success',
        title: '已确认到港',
        message: `车牌 ${activeReservation.vehicleNo} 已确认到港`,
      });
      await refreshAll();
    } else {
      pushNotification({ type: 'error', title: '操作失败', message: res.message });
    }
  };

  const handleStartLoading = async () => {
    setLoading('startLoading', true);
    if (selectedWorkerIds.length === 0) {
      pushNotification({ type: 'warning', title: '请先指派装卸工' });
      setLoading('startLoading', false);
      return;
    }
    const res = await api.reservations.assign(activeReservation.id, selectedWorkerIds);
    setLoading('startLoading', false);
    if (res.success) {
      pushNotification({
        type: 'success',
        title: '已开始装卸',
        message: `车牌 ${activeReservation.vehicleNo} 开始装卸作业`,
      });
      await refreshAll();
    } else {
      pushNotification({ type: 'error', title: '操作失败', message: res.message });
    }
  };

  const handleComplete = async () => {
    setLoading('completeReservation', true);
    const res = await api.reservations.complete(activeReservation.id);
    setLoading('completeReservation', false);
    if (res.success) {
      pushNotification({
        type: 'success',
        title: '已完成装卸',
        message: `车牌 ${activeReservation.vehicleNo} 已完成装卸`,
      });
      await refreshAll();
    } else {
      pushNotification({ type: 'error', title: '操作失败', message: res.message });
    }
  };

  const handleCancel = async () => {
    setLoading('cancelReservation', true);
    const res = await api.reservations.cancel(activeReservation.id);
    setLoading('cancelReservation', false);
    if (res.success) {
      pushNotification({
        type: 'success',
        title: '已取消预约',
        message: `车牌 ${activeReservation.vehicleNo} 预约已取消`,
      });
      await refreshAll();
    } else {
      pushNotification({ type: 'error', title: '操作失败', message: res.message });
    }
  };

  const toggleWorker = (workerId: string, isDisabled: boolean) => {
    if (isDisabled) return;
    setSelectedWorkerIds((prev) =>
      prev.includes(workerId)
        ? prev.filter((id) => id !== workerId)
        : [...prev, workerId]
    );
  };

  const handleExportLogs = () => {
    const headers = ['时间', '操作', '操作人', '角色', '详情'];
    const rows = logs
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((l) => [
        new Date(l.createdAt).toLocaleString('zh-CN'),
        l.actionLabel || actionLabels[l.action],
        l.operator,
        l.operatorRole || '-',
        (l.detail || '').replace(/\r?\n/g, ' '),
      ]);
    const csv =
      '\uFEFF' +
      [headers, ...rows]
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `预约${activeReservation.id.slice(-8)}_操作日志_${new Date()
      .toISOString()
      .split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushNotification({
      type: 'success',
      title: '导出成功',
      message: `${logs.length} 条日志已导出 CSV`,
    });
  };

  const assignedWorkers = workers.filter((w: Worker) =>
    (activeReservation.workerIds || []).includes(w.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-[640px] max-h-[92vh] overflow-auto animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary-500/10 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-neutral-800">
                预约详情
              </h3>
              <p className="text-xs text-neutral-500">
                预约编号：{activeReservation.id.slice(-8)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={refreshAll}
              className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors"
              title="刷新"
            >
              <Clock className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-display font-bold text-neutral-800">
                  {activeReservation.vehicleNo}
                </span>
                <StatusBadge type="reservation" status={activeReservation.status} />
              </div>
              <p className="text-sm text-neutral-500 mt-1">
                {activeReservation.vehicleType}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-neutral-600 flex items-center gap-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                {formatTime(activeReservation.startTime)}
              </div>
              <div className="text-sm text-primary-600 mt-1">
                {formatTimeOnly(activeReservation.startTime)} -{' '}
                {formatTimeOnly(activeReservation.endTime)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-neutral-50 rounded-lg p-3">
              <p className="text-xs text-neutral-500">月台</p>
              <p className="text-sm font-medium text-neutral-800 mt-1">
                {platform ? `${platform.code} - ${platform.name}` : '-'}
              </p>
            </div>
            <div className="bg-neutral-50 rounded-lg p-3">
              <p className="text-xs text-neutral-500">货主</p>
              <p className="text-sm font-medium text-neutral-800 mt-1">
                {shipper?.name || '-'}
              </p>
            </div>
            <div className="bg-neutral-50 rounded-lg p-3">
              <p className="text-xs text-neutral-500">货物类型</p>
              <p className="text-sm font-medium text-neutral-800 mt-1 flex items-center gap-1">
                <Package className="w-4 h-4 text-neutral-400" />
                {activeReservation.cargoType}
              </p>
            </div>
            <div className="bg-neutral-50 rounded-lg p-3">
              <p className="text-xs text-neutral-500">货物重量</p>
              <p className="text-sm font-medium text-neutral-800 mt-1">
                {activeReservation.cargoWeight} 吨
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-neutral-600">
            {activeReservation.arrivedAt && (
              <div>
                <span className="text-neutral-500">到港时间：</span>
                {formatTime(activeReservation.arrivedAt)}
              </div>
            )}
            {activeReservation.completedAt && (
              <div>
                <span className="text-neutral-500">完成时间：</span>
                {formatTime(activeReservation.completedAt)}
              </div>
            )}
            <div className="col-span-2">
              <span className="text-neutral-500">创建时间：</span>
              {formatTime(activeReservation.createdAt)}
            </div>
          </div>

          {(activeReservation.status === 'confirmed' ||
            activeReservation.status === 'loading') && (
            <div className="border-t border-neutral-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-neutral-600" />
                  <span className="text-sm font-medium text-neutral-700">装卸工指派</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setWorkerGroupFilter('all')}
                    className={cn(
                      'px-2 py-1 rounded text-xs font-medium transition-colors',
                      workerGroupFilter === 'all'
                        ? 'bg-primary-500 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    )}
                  >
                    全部
                  </button>
                  {groups.map((g) => (
                    <button
                      key={g}
                      onClick={() => setWorkerGroupFilter(g)}
                      className={cn(
                        'px-2 py-1 rounded text-xs font-medium transition-colors',
                        workerGroupFilter === g
                          ? 'bg-primary-500 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      )}
                    >
                      {g}组
                    </button>
                  ))}
                </div>
              </div>

              {assignedWorkers.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-neutral-500 mb-1">已指派：</p>
                  <div className="flex flex-wrap gap-1.5">
                    {assignedWorkers.map((w: Worker) => (
                      <span
                        key={w.id}
                        className="badge bg-primary-500/10 text-primary-500 border border-primary-500/30"
                      >
                        {w.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {activeReservation.status === 'confirmed' && (
                <>
                  <p className="text-xs text-neutral-500 mb-2 flex items-center gap-2">
                    选择装卸工（可多选）
                    <span className="text-xs text-neutral-400">
                      · 被其他预约占用的时段会标红
                    </span>
                  </p>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {assignableWorkers.length === 0 ? (
                      <div className="py-6 text-center text-neutral-400 text-sm">
                        该班组暂无装卸工
                      </div>
                    ) : (
                      assignableWorkers.map(
                        ({ worker, occupancy, isOccupied, isAssigned, isLeave, isDisabled }) => {
                          const selected = selectedWorkerIds.includes(worker.id);
                          return (
                            <label
                              key={worker.id}
                              className={cn(
                                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                                selected
                                  ? 'border-primary-500 bg-primary-500/10'
                                  : isDisabled
                                  ? 'border-danger/40 bg-danger/5 opacity-80 cursor-not-allowed'
                                  : isLeave
                                  ? 'border-neutral-200 bg-neutral-100 opacity-60 cursor-not-allowed'
                                  : 'border-neutral-200 hover:border-neutral-300'
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={selected || isAssigned}
                                disabled={isDisabled || isLeave}
                                onChange={() => toggleWorker(worker.id, isDisabled || isLeave)}
                                className="rounded text-primary-500 focus:ring-primary-400"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-neutral-800 truncate">
                                    {worker.name}
                                  </span>
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-500 font-medium">
                                    {worker.group}组
                                  </span>
                                  {isLeave && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-500 font-medium">
                                      请假
                                    </span>
                                  )}
                                  {isOccupied && !isAssigned && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-danger/10 text-danger font-medium flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" />
                                      时段冲突：
                                      {occupancy
                                        .map((o) => o.vehicleNo)
                                        .slice(0, 2)
                                        .join('、')}
                                      {occupancy.length > 2 && '...'}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-neutral-500 mt-1 flex items-center gap-3">
                                  <StatusBadge type="worker" status={worker.status} />
                                  <span>今日 {worker.todayTasks} 单</span>
                                </div>
                              </div>
                            </label>
                          );
                        }
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="border-t border-neutral-200 pt-4">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-neutral-600" />
                <span className="text-sm font-medium text-neutral-700">操作日志</span>
                <span className="text-xs text-neutral-400">共 {logs.length} 条</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  className="input-field py-1 px-2 text-xs h-auto min-w-[110px]"
                  value={logActionFilter}
                  onChange={(e) =>
                    setLogActionFilter(e.target.value as 'all' | OperationLog['action'])
                  }
                >
                  <option value="all">全部动作</option>
                  {(Object.keys(actionLabels) as OperationLog['action'][]).map((a) => (
                    <option key={a} value={a}>
                      {actionLabels[a]}
                    </option>
                  ))}
                </select>
                <button
                  className="btn-outline !py-1 !px-3 text-xs flex items-center gap-1"
                  onClick={handleExportLogs}
                  disabled={logs.length === 0}
                >
                  <Download className="w-3.5 h-3.5" />
                  导出
                </button>
                <Filter className="w-3.5 h-3.5 text-neutral-400" />
              </div>
            </div>
            {filteredLogs.length === 0 ? (
              <div className="py-8 text-center text-neutral-400 text-sm">
                {logActionFilter !== 'all' ? '该类型暂无操作日志' : '暂无操作日志'}
              </div>
            ) : (
              <div className="relative space-y-4 max-h-72 overflow-y-auto pr-1">
                {filteredLogs.map((log, index) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="relative flex flex-col items-center">
                      <div
                        className={cn(
                          'w-3 h-3 rounded-full ring-2 ring-white z-10',
                          index === 0 ? 'bg-primary-500' : 'bg-neutral-300'
                        )}
                      />
                      {index < filteredLogs.length - 1 && (
                        <div className="w-0.5 bg-neutral-200 flex-1 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full border font-medium',
                            actionColorMap[log.action] ||
                              'bg-neutral-100 text-neutral-600 border-neutral-200'
                          )}
                        >
                          {log.actionLabel || log.action}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {log.operator}
                          <span className="text-neutral-300 mx-1">·</span>
                          {formatTime(log.createdAt)}
                        </span>
                      </div>
                      {log.detail && (
                        <p className="text-xs text-neutral-500">{log.detail}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-neutral-200 bg-neutral-50 sticky bottom-0">
          <button className="btn-outline" onClick={onClose}>
            关闭
          </button>
          {activeReservation.status === 'pending' && (
            <>
              <button className="btn-danger" onClick={handleCancel}>
                <XCircle className="w-4 h-4 inline mr-1" />
                取消预约
              </button>
              <button className="btn-primary" onClick={handleConfirm}>
                <Check className="w-4 h-4 inline mr-1" />
                确认到港
              </button>
            </>
          )}
          {activeReservation.status === 'confirmed' && (
            <>
              <button className="btn-danger" onClick={handleCancel}>
                <XCircle className="w-4 h-4 inline mr-1" />
                取消
              </button>
              <button className="btn-accent" onClick={handleStartLoading}>
                <PlayCircle className="w-4 h-4 inline mr-1" />
                开始装卸
              </button>
            </>
          )}
          {activeReservation.status === 'loading' && (
            <button className="btn-primary" onClick={handleComplete}>
              <Check className="w-4 h-4 inline mr-1" />
              完成装卸
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
