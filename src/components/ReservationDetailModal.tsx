import { useState, useEffect } from 'react';
import { X, Truck, Package, Clock, Check, XCircle, PlayCircle, Users } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { api } from '../lib/api';
import StatusBadge from './StatusBadge';
import type { Reservation, Platform, Shipper, Worker } from '../../shared/types';

interface Props {
  open: boolean;
  onClose: () => void;
  reservation: Reservation | null;
}

export default function ReservationDetailModal({ open, onClose, reservation }: Props) {
  const platforms = useAppStore((s) => s.platforms);
  const quotaOverview = useAppStore((s) => s.quotaOverview);
  const workers = useAppStore((s) => s.workers);
  const pushNotification = useAppStore((s) => s.pushNotification);
  const fetchReservations = useAppStore((s) => s.fetchReservations);
  const fetchWorkers = useAppStore((s) => s.fetchWorkers);
  const fetchQuota = useAppStore((s) => s.fetchQuota);
  const setLoading = useAppStore((s) => s.setLoading);

  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);

  useEffect(() => {
    if (open && reservation) {
      setSelectedWorkerIds(reservation.workerIds || []);
    }
  }, [open, reservation]);

  if (!open || !reservation) return null;

  const platform: Platform | undefined = platforms.find(
    (p: Platform) => p.id === reservation.platformId
  );
  const shippers: Shipper[] = quotaOverview?.shippers || [];
  const shipper: Shipper | undefined = shippers.find(
    (s: Shipper) => s.id === reservation.shipperId
  );

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
    const res = await api.reservations.confirm(reservation.id);
    setLoading('confirmReservation', false);
    if (res.success) {
      pushNotification({ type: 'success', title: '已确认到港', message: `车牌 ${reservation.vehicleNo} 已确认到港` });
      fetchReservations();
      onClose();
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
    const res = await api.reservations.assign(reservation.id, selectedWorkerIds);
    setLoading('startLoading', false);
    if (res.success) {
      pushNotification({ type: 'success', title: '已开始装卸', message: `车牌 ${reservation.vehicleNo} 开始装卸作业` });
      fetchReservations();
      fetchWorkers();
      onClose();
    } else {
      pushNotification({ type: 'error', title: '操作失败', message: res.message });
    }
  };

  const handleComplete = async () => {
    setLoading('completeReservation', true);
    const res = await api.reservations.complete(reservation.id);
    setLoading('completeReservation', false);
    if (res.success) {
      pushNotification({ type: 'success', title: '已完成装卸', message: `车牌 ${reservation.vehicleNo} 已完成装卸` });
      fetchReservations();
      fetchWorkers();
      fetchQuota();
      onClose();
    } else {
      pushNotification({ type: 'error', title: '操作失败', message: res.message });
    }
  };

  const handleCancel = async () => {
    setLoading('cancelReservation', true);
    const res = await api.reservations.cancel(reservation.id);
    setLoading('cancelReservation', false);
    if (res.success) {
      pushNotification({ type: 'success', title: '已取消预约', message: `车牌 ${reservation.vehicleNo} 预约已取消` });
      fetchReservations();
      fetchQuota();
      onClose();
    } else {
      pushNotification({ type: 'error', title: '操作失败', message: res.message });
    }
  };

  const toggleWorker = (workerId: string) => {
    setSelectedWorkerIds((prev) =>
      prev.includes(workerId) ? prev.filter((id) => id !== workerId) : [...prev, workerId]
    );
  };

  const assignedWorkers = workers.filter((w: Worker) =>
    (reservation.workerIds || []).includes(w.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-[560px] max-h-[90vh] overflow-auto animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary-500/10 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-neutral-800">预约详情</h3>
              <p className="text-xs text-neutral-500">预约编号：{reservation.id.slice(-8)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-display font-bold text-neutral-800">
                  {reservation.vehicleNo}
                </span>
                <StatusBadge type="reservation" status={reservation.status} />
              </div>
              <p className="text-sm text-neutral-500 mt-1">{reservation.vehicleType}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-neutral-600">
                <Clock className="w-4 h-4 inline mr-1" />
                {formatTimeOnly(reservation.startTime)} - {formatTimeOnly(reservation.endTime)}
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
              <p className="text-sm font-medium text-neutral-800 mt-1">{shipper?.name || '-'}</p>
            </div>
            <div className="bg-neutral-50 rounded-lg p-3">
              <p className="text-xs text-neutral-500">货物类型</p>
              <p className="text-sm font-medium text-neutral-800 mt-1 flex items-center gap-1">
                <Package className="w-4 h-4 text-neutral-400" />
                {reservation.cargoType}
              </p>
            </div>
            <div className="bg-neutral-50 rounded-lg p-3">
              <p className="text-xs text-neutral-500">货物重量</p>
              <p className="text-sm font-medium text-neutral-800 mt-1">{reservation.cargoWeight} 吨</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-neutral-600">
            {reservation.arrivedAt && (
              <div>
                <span className="text-neutral-500">到港时间：</span>
                {formatTime(reservation.arrivedAt)}
              </div>
            )}
            {reservation.completedAt && (
              <div>
                <span className="text-neutral-500">完成时间：</span>
                {formatTime(reservation.completedAt)}
              </div>
            )}
            <div className="col-span-2">
              <span className="text-neutral-500">创建时间：</span>
              {formatTime(reservation.createdAt)}
            </div>
          </div>

          {(reservation.status === 'confirmed' || reservation.status === 'loading') && (
            <div className="border-t border-neutral-200 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-neutral-600" />
                <span className="text-sm font-medium text-neutral-700">装卸工指派</span>
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
              {reservation.status === 'confirmed' && (
                <>
                  <p className="text-xs text-neutral-500 mb-2">选择装卸工（可多选）：</p>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-auto">
                    {workers
                      .filter((w: Worker) => w.status === 'idle' || (reservation.workerIds || []).includes(w.id))
                      .map((w: Worker) => {
                        const selected = selectedWorkerIds.includes(w.id);
                        return (
                          <label
                          key={w.id}
                          className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-all ${
                            selected
                              ? 'border-primary-500 bg-primary-500/10'
                              : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleWorker(w.id)}
                            className="rounded text-primary-500 focus:ring-primary-400"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-800 truncate">
                              {w.name}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {w.group} · 今日{w.todayTasks}单
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-neutral-200 bg-neutral-50">
          <button className="btn-outline" onClick={onClose}>
            关闭
          </button>
          {reservation.status === 'pending' && (
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
          {reservation.status === 'confirmed' && (
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
          {reservation.status === 'loading' && (
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
