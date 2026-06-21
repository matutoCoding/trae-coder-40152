import { useState, useEffect } from 'react';
import { Users, Plus, Calendar, Clock, Truck, Package, Check, XCircle, User, AlertTriangle, SkipForward } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import StatusBadge from '../components/StatusBadge';
import WaitlistModal from '../components/WaitlistModal';
import Empty from '../components/Empty';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import type { WaitlistItem } from '../../shared/types';

function useCountdown(notifiedAt: string | undefined, totalMinutes: number) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!notifiedAt || totalMinutes <= 0) {
      setTimeLeft(0);
      return;
    }

    const calculate = () => {
      const notifiedTime = new Date(notifiedAt).getTime();
      const now = Date.now();
      const endTime = notifiedTime + totalMinutes * 60 * 1000;
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeLeft(remaining);
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [notifiedAt, totalMinutes]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  let colorClass = 'bg-success/15 text-success border border-success/30';
  let blink = false;
  if (timeLeft <= 60) {
    colorClass = 'bg-danger/20 text-danger border border-danger/40';
    blink = true;
  } else if (timeLeft <= 180) {
    colorClass = 'bg-warning/20 text-warning-700 border border-warning/40';
  }

  return { timeLeft, formatted, colorClass, blink };
}

interface WaitlistCardProps {
  item: WaitlistItem;
  shipperName: string;
  confirmMinutes: number;
  isLoading: boolean;
  onConfirm: (item: WaitlistItem) => void;
  onSkip: (item: WaitlistItem) => void;
  onCancel: (item: WaitlistItem) => void;
}

function WaitlistCard({ item, shipperName, confirmMinutes, isLoading, onConfirm, onSkip, onCancel }: WaitlistCardProps) {
  const countdown = useCountdown(item.notifiedAt, item.status === 'notified' ? confirmMinutes : 0);

  const priorityConfig: Record<number, { bg: string; ring: string; label: string }> = {
    1: { bg: 'bg-neutral-100 text-neutral-600', ring: 'ring-neutral-300', label: '普通' },
    2: { bg: 'bg-blue-50 text-blue-600', ring: 'ring-blue-300', label: '较低' },
    3: { bg: 'bg-primary-500/10 text-primary-500', ring: 'ring-primary-500/30', label: '普通' },
    4: { bg: 'bg-accent-500/20 text-accent-500', ring: 'ring-accent-500/40', label: '较高' },
    5: { bg: 'bg-danger/20 text-danger', ring: 'ring-danger/40', label: '紧急' },
  };

  const cfg = priorityConfig[item.priority];

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
    <div
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
            <p className="font-semibold text-neutral-800">{shipperName}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <StatusBadge type="waitlist" status={item.status} />
              {item.status === 'notified' && (
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium font-mono inline-flex items-center gap-1',
                  countdown.colorClass,
                  countdown.blink && 'animate-pulse'
                )}>
                  <Clock className="w-3 h-3" />
                  {countdown.formatted}
                </span>
              )}
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
        {item.status === 'skipped' && (
          <>
            <div className="flex items-center gap-2 text-neutral-500">
              <SkipForward className="w-4 h-4" />
              <span>跳过时间：{formatDateTime(item.skippedAt || '')}</span>
            </div>
            {item.skipReason && (
              <div className="mt-2 px-3 py-2 bg-neutral-100 rounded-lg text-xs text-neutral-600">
                <span className="font-medium">跳过原因：</span>{item.skipReason}
              </div>
            )}
          </>
        )}
      </div>

      {(item.status === 'notified' || item.status === 'waiting' || item.status === 'skipped') && (
        <div className="mt-4 pt-4 border-t border-neutral-100 flex gap-2">
          {item.status === 'notified' && (
            <>
              <button
                onClick={() => onSkip(item)}
                disabled={isLoading}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-neutral-300 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SkipForward className="w-4 h-4" />
                {isLoading ? '处理中...' : '跳过'}
              </button>
              <button
                onClick={() => onConfirm(item)}
                disabled={isLoading}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                {isLoading ? '处理中...' : '确认补位'}
              </button>
            </>
          )}
          {item.status === 'waiting' && (
            <button
              onClick={() => onCancel(item)}
              disabled={isLoading}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-neutral-300 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="w-4 h-4" />
              {isLoading ? '处理中...' : '取消候补'}
            </button>
          )}
          {item.status === 'skipped' && (
            <button
              disabled
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-100 text-neutral-400 rounded-lg text-sm font-medium cursor-not-allowed"
            >
              <SkipForward className="w-4 h-4" />
              已跳过
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Waitlist() {
  const waitlist = useAppStore(s => s.waitlist);
  const shippers = useAppStore(s => s.quotaOverview?.shippers || []);
  const settings = useAppStore(s => s.settings);
  const fetchWaitlist = useAppStore(s => s.fetchWaitlist);
  const fetchQuota = useAppStore(s => s.fetchQuota);
  const fetchSettings = useAppStore(s => s.fetchSettings);
  const pushNotification = useAppStore(s => s.pushNotification);

  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchWaitlist();
    fetchQuota();
    fetchSettings();
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

  const handleSkip = async (item: WaitlistItem) => {
    setActionLoading(item.id);
    try {
      const res = await api.waitlist.skip(item.id);
      if (res.success) {
        pushNotification({ type: 'info', title: '已跳过', message: `车牌号 ${item.vehicleNo} 已跳过，将通知下一位` });
        await fetchWaitlist();
      } else {
        pushNotification({ type: 'error', title: '操作失败', message: res.message });
      }
    } catch (err) {
      pushNotification({ type: 'error', title: '操作失败', message: (err as Error).message });
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

  const confirmMinutes = settings?.waitlistConfirmMinutes || 10;

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
          {sortedWaitlist.map(item => (
            <WaitlistCard
              key={item.id}
              item={item}
              shipperName={getShipperName(item.shipperId)}
              confirmMinutes={confirmMinutes}
              isLoading={actionLoading === item.id}
              onConfirm={handleConfirm}
              onSkip={handleSkip}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}

      <WaitlistModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
