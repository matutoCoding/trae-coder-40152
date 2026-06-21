import { useState, useMemo } from 'react';
import { X, User, Clock } from 'lucide-react';
import type { Reservation, Worker, Platform, Shipper } from '../../shared/types';
import { useAppStore } from '../store/appStore';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  reservation: Reservation | null;
}

export default function DispatchModal({ open, onClose, reservation }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  const workers = useAppStore(s => s.workers);
  const platforms = useAppStore(s => s.platforms);
  const quotaOverview = useAppStore(s => s.quotaOverview);
  const pushNotification = useAppStore(s => s.pushNotification);
  const fetchReservations = useAppStore(s => s.fetchReservations);
  const fetchWorkers = useAppStore(s => s.fetchWorkers);

  if (!open || !reservation) return null;

  const groups = useMemo(() => {
    const groupSet = new Set(workers.map(w => w.group));
    return Array.from(groupSet).sort();
  }, [workers]);

  const idleWorkers = useMemo(() => {
    let result = workers.filter(w => w.status === 'idle');
    if (selectedGroup !== 'all') {
      result = result.filter(w => w.group === selectedGroup);
    }
    return result;
  }, [workers, selectedGroup]);
  const platform = platforms.find(p => p.id === reservation.platformId);
  const shipper = quotaOverview?.shippers.find(s => s.id === reservation.shipperId);

  const formatTime = (t: string) => {
    const d = new Date(t);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const toggleWorker = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      pushNotification({ type: 'warning', title: '请选择装卸工', message: '至少选择一名装卸工' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.reservations.assign(reservation.id, selectedIds);
      if (res.success) {
        pushNotification({ type: 'success', title: '派工成功', message: `已指派 ${selectedIds.length} 名装卸工` });
        await Promise.all([fetchReservations(), fetchWorkers()]);
        onClose();
        setSelectedIds([]);
      } else {
        pushNotification({ type: 'error', title: '派工失败', message: res.message });
      }
    } catch (e) {
      pushNotification({ type: 'error', title: '派工失败', message: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-[640px] max-h-[85vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h3 className="font-display font-semibold text-lg text-neutral-800">装卸工派工</h3>
          <button
            onClick={() => { onClose(); setSelectedIds([]); }}
            className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          <div className="bg-primary-50 rounded-lg p-4 border border-primary-100">
            <h4 className="font-semibold text-sm text-primary-700 mb-3">预约信息</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-neutral-500">月台：</span>
                <span className="font-medium text-neutral-800">{platform?.code} - {platform?.name}</span>
              </div>
              <div>
                <span className="text-neutral-500">货主：</span>
                <span className="font-medium text-neutral-800">{shipper?.name}</span>
              </div>
              <div>
                <span className="text-neutral-500">车牌号：</span>
                <span className="font-medium text-neutral-800">{reservation.vehicleNo}</span>
              </div>
              <div>
                <span className="text-neutral-500">车型：</span>
                <span className="font-medium text-neutral-800">{reservation.vehicleType}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-neutral-400" />
                <span className="text-neutral-800">{formatTime(reservation.startTime)} - {formatTime(reservation.endTime)}</span>
              </div>
              <div>
                <span className="text-neutral-500">货物：</span>
                <span className="font-medium text-neutral-800">{reservation.cargoType} ({reservation.cargoWeight}吨)</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm text-neutral-800">选择空闲装卸工</h4>
              <span className="text-xs text-neutral-500">已选 {selectedIds.length} 人</span>
            </div>
            <div className="flex items-center gap-1 mb-3 pb-3 border-b border-neutral-100">
              <button
                onClick={() => setSelectedGroup('all')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  selectedGroup === 'all'
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                )}
              >
                全部
              </button>
              {groups.map(g => (
                <button
                  key={g}
                  onClick={() => setSelectedGroup(g)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    selectedGroup === g
                      ? 'bg-primary-500 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  )}
                >
                  {g}组
                </button>
              ))}
            </div>
            {idleWorkers.length === 0 ? (
              <div className="py-12 text-center text-neutral-500 text-sm border border-dashed border-neutral-200 rounded-lg">
                暂无空闲装卸工
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                {idleWorkers.map(worker => (
                  <label
                    key={worker.id}
                    className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all duration-200 ${
                      selectedIds.includes(worker.id)
                        ? 'border-accent-500 bg-accent-50'
                        : 'border-neutral-200 hover:border-primary-300 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="absolute top-3 right-3 w-4 h-4 accent-accent-500"
                      checked={selectedIds.includes(worker.id)}
                      onChange={() => toggleWorker(worker.id)}
                    />
                    <div className="flex items-center gap-3 pr-6">
                      <div className="w-10 h-10 rounded-full bg-success/20 text-success flex items-center justify-center font-semibold">
                        {worker.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-neutral-800 text-sm">{worker.name}</p>
                        <p className="text-xs text-neutral-500 flex items-center gap-1 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-500 font-medium">
                            {worker.group}组
                          </span>
                          <span>· 今日{worker.todayTasks}单</span>
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50 rounded-b-xl">
          <button
            className="btn-outline"
            onClick={() => { onClose(); setSelectedIds([]); }}
            disabled={submitting}
          >
            取消
          </button>
          <button
            className="btn-accent"
            onClick={handleSubmit}
            disabled={submitting || selectedIds.length === 0}
          >
            {submitting ? '提交中...' : '确认派工'}
          </button>
        </div>
      </div>
    </div>
  );
}
