import { useState, useEffect } from 'react';
import { Users, Plus, Calendar, Clock, Truck, Package, Check, XCircle, User, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import StatusBadge from '../components/StatusBadge';
import WaitlistModal from '../components/WaitlistModal';
import Empty from '../components/Empty';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import type { WaitlistItem } from '../../shared/types';

export default function Waitlist() {
  const waitlist = useAppStore(s => s.waitlist);
  const shippers = useAppStore(s => s.quotaOverview?.shippers || []);
  const fetchWaitlist = useAppStore(s => s.fetchWaitlist);
  const fetchQuota = useAppStore(s => s.fetchQuota);
  const pushNotification = useAppStore(s => s.pushNotification);

  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchWaitlist();
    fetchQuota();
  }, []);

  const getShipperName = (shipperId: string) => shippers.find(s => s.id === shipperId)?.name || '未知货主';

  const sortedWaitlist = [...waitlist].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const waitingCount = waitlist.filter(w => w.status === 'waiting' || w.status === 'notified').length;
  const notifiedCount = waitlist.filter(w => w.status === 'notified').length;

  const handleConfirm = async (item: WaitlistItem) => {
    setActionLoading(item.id);
    try {
      const res = await api.waitlist.confirm(item.id);
      if (res.success) {
        pushNotification({ type: 'success', title: '补位确认成功', message: `车牌号 ${item.vehicleNo} 已成功转为预约` });
        await fetchWaitlist();
      } else {
        pushNotification({ type: 'error', title: '补位确认失败', message: res.message });
      }
    } catch (err) {
      pushNotification({ type: 'error', title: '补位确认失败', message: (err as Error).message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (item: WaitlistItem) => {
    setActionLoading(item.id);
    try {
      const res = await api.waitlist.remove(item.id);
      if (res.success) {
        pushNotification({ type: 'info', title: '已取消候补', message: `车牌号 ${item.vehicleNo} 已从候补队列移除` });
        await fetchWaitlist();
      } else {
        pushNotification({ type: 'error', title: '取消失败', message: res.message });
      }
    } catch (err) {
      pushNotification({ type: 'error', title: '取消失败', message: (err as Error).message });
    } finally {
      setActionLoading(null);
    }
  };

  const priorityConfig: Record<number, { bg: string; ring: string; label: string }> = {
    1: { bg: 'bg-neutral-100 text-neutral-600', ring: 'ring-neutral-300', label: '普通' },
    2: { bg: 'bg-blue-50 text-blue-600', ring: 'ring-blue-300', label: '较低' },
    3: { bg: 'bg-primary-500/10 text-primary-500', ring: 'ring-primary-500/30', label: '普通' },
    4: { bg: 'bg-accent-500/20 text-accent-500', ring: 'ring-accent-500/40', label: '较高' },
    5: { bg: 'bg-danger/20 text-danger', ring: 'ring-danger/40', label: '紧急' },
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day} ${h}:${mi}`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-neutral-800">候补补位队列</h1>
            <p className="text-sm text-neutral-500">管理候补车辆，按优先级排序补位</p>
          </div>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors shadow-card hover:shadow-card-hover"
        >
          <Plus className="w-5 h-5" />
          登记候补
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-card border border-neutral-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-neutral-500">候补总数</span>
            <div className="w-9 h-9 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-500" />
            </div>
          </div>
          <p className="font-display font-bold text-3xl text-neutral-800">{waitlist.length}</p>
          <p className="text-xs text-neutral-400 mt-1">所有状态候补记录</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card border border-neutral-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-neutral-500">等待中</span>
            <div className="w-9 h-9 rounded-lg bg-accent-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-accent-500" />
            </div>
          </div>
          <p className="font-display font-bold text-3xl text-neutral-800">{waitingCount}</p>
          <p className="text-xs text-neutral-400 mt-1">待通知候补</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card border border-neutral-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-neutral-500">已通知待确认</span>
            <div className="w-9 h-9 rounded-lg bg-warning/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" style={{ color: '#c9972b' }} />
            </div>
          </div>
          <p className="font-display font-bold text-3xl text-neutral-800">{notifiedCount}</p>
          <p className="text-xs text-neutral-400 mt-1">等待货主确认</p>
        </div>
      </div>

      {sortedWaitlist.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-card border border-neutral-100">
          <Empty />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedWaitlist.map(item => {
            const cfg = priorityConfig[item.priority];
            const isLoading = actionLoading === item.id;
            return (
              <div
                key={item.id}
                className={cn(
                  'bg-white rounded-xl p-5 shadow-card border border-neutral-100 hover:shadow-card-hover transition-all duration-300',
                  item.priority >= 4 && 'border-l-4',
                  item.priority === 5 && 'border-l-danger',
                  item.priority === 4 && 'border-l-accent-500'
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center font-display font-bold text-lg ring-2',
                      cfg.bg, cfg.ring
                    )}>
                      {item.priority}
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-800">{getShipperName(item.shipperId)}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <StatusBadge type="waitlist" status={item.status} />
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cfg.bg)}>
                          P{item.priority} · {cfg.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-neutral-600">
                    <Truck className="w-4 h-4 text-neutral-400" />
                    <span className="font-medium text-neutral-700">{item.vehicleNo}</span>
                    <span className="text-neutral-300">·</span>
                    <span>{item.vehicleType}</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-600">
                    <Package className="w-4 h-4 text-neutral-400" />
                    <span>{item.cargoType}</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-600">
                    <Calendar className="w-4 h-4 text-neutral-400" />
                    <span>目标日期：{formatDate(item.targetDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-600">
                    <Clock className="w-4 h-4 text-neutral-400" />
                    <span>登记时间：{formatDateTime(item.createdAt)}</span>
                  </div>
                  {item.notifiedAt && (
                    <div className="flex items-center gap-2 text-accent-500">
                      <User className="w-4 h-4" />
                      <span>通知时间：{formatDateTime(item.notifiedAt)}</span>
                    </div>
                  )}
                </div>

                {(item.status === 'notified' || item.status === 'waiting') && (
                  <div className="mt-4 pt-4 border-t border-neutral-100 flex gap-2">
                    {item.status === 'notified' && (
                      <button
                        onClick={() => handleConfirm(item)}
                        disabled={isLoading || !!actionLoading}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Check className="w-4 h-4" />
                        {isLoading ? '处理中...' : '确认补位'}
                      </button>
                    )}
                    {item.status === 'waiting' && (
                      <button
                        onClick={() => handleCancel(item)}
                        disabled={isLoading || !!actionLoading}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-neutral-300 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle className="w-4 h-4" />
                        {isLoading ? '处理中...' : '取消候补'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <WaitlistModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
