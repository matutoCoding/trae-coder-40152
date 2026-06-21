import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Clock,
  User,
  Package,
  CheckCircle2,
  SkipForward,
  XCircle,
  BellRing,
  ArrowRight,
  Truck,
  Zap,
  History,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { api } from '../lib/api';
import WaitlistModal from '../components/WaitlistModal';
import StatusBadge from '../components/StatusBadge';
import type { WaitlistItem, Reservation, Platform, Shipper } from '../../shared/types';
import { cn } from '../lib/utils';

function useCountdown(targetIso: string | undefined, enabled: boolean) {
  const [remaining, setRemaining] = useState(() => {
    if (!enabled || !targetIso) return { total: 0, expired: false };
    const diff = new Date(targetIso).getTime() - Date.now();
    return { total: Math.max(0, diff), expired: diff <= 0 };
  });
  useEffect(() => {
    if (!enabled || !targetIso) {
      setRemaining({ total: 0, expired: false });
      return;
    }
    const calc = () => {
      const diff = new Date(targetIso).getTime() - Date.now();
      const total = Math.max(0, diff);
      setRemaining({ total, expired: diff <= 0 });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetIso, enabled]);
  return remaining;
}

const statusMeta: Record<WaitlistItem['status'], { color: string; dot: string; icon: any; title: string }> = {
  waiting:   { color: 'bg-primary-50',        dot: 'bg-primary-500',      icon: Clock,       title: '排队中' },
  notified:  { color: 'bg-accent-500/5',      dot: 'bg-accent-500',       icon: BellRing,    title: '已通知待确认' },
  confirmed: { color: 'bg-warning/10',        dot: 'bg-warning',          icon: CheckCircle2,title: '已确认' },
  converted: { color: 'bg-success/10',        dot: 'bg-success',          icon: Truck,       title: '已转正' },
  cancelled: { color: 'bg-neutral-100',       dot: 'bg-neutral-400',      icon: XCircle,     title: '已取消' },
  skipped:   { color: 'bg-danger/5',          dot: 'bg-danger',           icon: SkipForward, title: '已跳过' },
};

interface WaitlistCardProps {
  item: WaitlistItem;
  index: number;
  shipper?: Shipper;
  platforms: Platform[];
  reservations: Reservation[];
  waitConfirmMinutes: number;
  onConfirm: (item: WaitlistItem) => void;
  onSkip: (item: WaitlistItem) => void;
  onCancel: (item: WaitlistItem) => void;
  submitting: boolean;
}

function WaitlistCard({
  item, index, shipper, platforms, reservations, waitConfirmMinutes,
  onConfirm, onSkip, onCancel, submitting,
}: WaitlistCardProps) {
  const meta = statusMeta[item.status];
  const Icon = meta.icon;

  const releasedPlatform = platforms.find((p) => p.id === item.releasedPlatformId);
  const notifiedReservation = reservations.find((r) => r.id === item.notifiedReservationId);
  const convertedReservation = reservations.find((r) => r.id === item.convertedReservationId);

  const deadlineIso = useMemo(() => {
    if (item.status === 'notified' && item.notifiedAt) {
      return new Date(new Date(item.notifiedAt).getTime() + waitConfirmMinutes * 60 * 1000).toISOString();
    }
    return undefined;
  }, [item.status, item.notifiedAt, waitConfirmMinutes]);

  const { total, expired } = useCountdown(deadlineIso, item.status === 'notified');
  const mm = Math.floor((total % (60 * 60 * 1000)) / (60 * 1000));
  const ss = Math.floor((total % (60 * 1000)) / 1000);
  const countdownStr = expired ? '已超时' : `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  const countdownColor = expired
    ? 'bg-danger text-white'
    : mm < 3
    ? 'bg-danger text-white animate-pulse'
    : mm < 10
    ? 'bg-warning text-white'
    : 'bg-success text-white';

  const releaseTimeRange =
    item.releasedStartTime && item.releasedEndTime
      ? `${item.releasedStartTime.slice(11, 16)} - ${item.releasedEndTime.slice(11, 16)}`
      : notifiedReservation
      ? `${notifiedReservation.startTime.slice(11, 16)} - ${notifiedReservation.endTime.slice(11, 16)}`
      : null;

  const releasePlatformCode = releasedPlatform
    ? `${releasedPlatform.code} - ${releasedPlatform.name}`
    : notifiedReservation
    ? platforms.find((p) => p.id === notifiedReservation.platformId)?.code || '-'
    : '-';

  return (
    <div className={cn('card relative overflow-hidden transition-all', meta.color)}>
      <div className={cn('absolute left-0 top-0 bottom-0 w-1.5', meta.dot)} />

      <div className="flex items-start gap-4 pl-5">
        <div className="w-11 h-11 rounded-xl bg-white border border-neutral-200 flex flex-col items-center justify-center shadow-sm flex-shrink-0">
          <Icon className={cn('w-5 h-5', meta.dot.replace('bg-', 'text-'))} />
          <span className="text-[10px] font-bold text-neutral-600 mt-0.5">
            #{(index + 1).toString().padStart(2, '0')}
          </span>
        </div>

        <div className="flex-1 min-w-0 py-1">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-display font-bold text-xl text-neutral-800 truncate">
                  {item.vehicleNo}
                </span>
                <StatusBadge type="waitlist" status={item.status} />
                <span className="badge bg-primary-50 text-primary-600 border border-primary-500/20">
                  优先级{' '}
                  <span className="font-bold ml-0.5">
                    {'★'.repeat(item.priority)}
                    <span className="opacity-20">{'★'.repeat(5 - item.priority)}</span>
                  </span>
                </span>
                {item.status === 'notified' && (
                  <span className={cn('badge font-mono font-bold tracking-wider !py-0.5', countdownColor)}>
                    <Clock className="w-3 h-3 inline mr-1" />
                    {countdownStr}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-neutral-500 flex-wrap">
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{shipper?.name || '-'}</span>
                <span className="text-neutral-300">·</span>
                <span>{item.vehicleType}</span>
                <span className="text-neutral-300">·</span>
                <span className="flex items-center gap-1"><Package className="w-3 h-3" />{item.cargoType}</span>
                <span className="text-neutral-300">·</span>
                <span>目标日期 {item.targetDate}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {(item.status === 'waiting' || item.status === 'notified') && (
                <>
                  {item.status === 'notified' && (
                    <>
                      <button
                        className="btn-success !py-1.5 !px-3 text-xs flex items-center gap-1"
                        onClick={() => onConfirm(item)}
                        disabled={submitting}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        确认补位
                      </button>
                      <button
                        className="btn-outline !py-1.5 !px-3 text-xs flex items-center gap-1"
                        onClick={() => onSkip(item)}
                        disabled={submitting}
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                        跳过
                      </button>
                    </>
                  )}
                  <button
                    className="btn-danger !py-1.5 !px-3 text-xs flex items-center gap-1"
                    onClick={() => onCancel(item)}
                    disabled={submitting}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    取消
                  </button>
                </>
              )}
            </div>
          </div>

          {(item.notifiedReservationId ||
            item.releasedPlatformId ||
            item.convertedReservationId ||
            item.skipReason ||
            item.status === 'skipped' ||
            item.status === 'converted' ||
            item.status === 'notified') && (
            <div className="mt-4 pt-3 border-t border-neutral-200/60">
              <div className="flex items-center gap-2 flex-wrap">
                {item.status === 'notified' && (
                  <>
                    <span className="text-xs font-medium text-neutral-600 flex items-center gap-1">
                      <BellRing className="w-3.5 h-3.5 text-accent-500" />
                      已通知空位：
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-white border border-neutral-200 text-neutral-700 shadow-sm">
                      {releasePlatformCode}
                    </span>
                    {releaseTimeRange && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-white border border-neutral-200 text-neutral-700 shadow-sm font-mono">
                        {releaseTimeRange}
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="text-xs text-accent-600 font-medium">等待司机确认…</span>
                  </>
                )}

                {item.status === 'skipped' && (
                  <>
                    <span className="text-xs font-medium text-neutral-600 flex items-center gap-1">
                      <SkipForward className="w-3.5 h-3.5 text-danger" />
                      跳过原因：
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-danger/10 text-danger border border-danger/20 font-medium">
                      {item.skipReason || '未说明原因'}
                    </span>
                    {item.skippedAt && (
                      <span className="text-xs text-neutral-400">
                        · 跳过时间 {new Date(item.skippedAt).toLocaleString('zh-CN', {
                          month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    )}
                  </>
                )}

                {item.status === 'converted' && (
                  <>
                    <span className="text-xs font-medium text-neutral-600 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-success" />
                      补位成功：
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="text-xs px-2 py-0.5 rounded-md bg-success/10 text-success border border-success/20 font-mono">
                      预约编号 {convertedReservation?.id.slice(-8) || item.convertedReservationId?.slice(-8)}
                    </span>
                    {convertedReservation && (
                      <span className="text-xs text-neutral-500">
                        {new Date(convertedReservation.startTime).toLocaleString('zh-CN', {
                          month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    )}
                  </>
                )}

                {item.status === 'waiting' &&
                  (item.releasedPlatformId || item.notifiedReservationId) && (
                    <>
                      <span className="text-xs font-medium text-neutral-600 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-primary-500" />
                        匹配到空位候补：
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-white border border-neutral-200 text-neutral-700 shadow-sm">
                        {releasePlatformCode}
                      </span>
                      {releaseTimeRange && (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-white border border-neutral-200 text-neutral-700 shadow-sm font-mono">
                          {releaseTimeRange}
                        </span>
                      )}
                    </>
                  )}

                {item.status === 'confirmed' && (
                  <span className="text-xs font-medium text-warning-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    已确认，等待创建预约…
                  </span>
                )}

                {item.status === 'cancelled' && (
                  <span className="text-xs font-medium text-neutral-500 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    用户主动取消排队
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Waitlist() {
  const waitlist = useAppStore((s) => s.waitlist);
  const reservations = useAppStore((s) => s.reservations);
  const quotaOverview = useAppStore((s) => s.quotaOverview);
  const platforms = useAppStore((s) => s.platforms);
  const settings = useAppStore((s) => s.settings);
  const fetchWaitlist = useAppStore((s) => s.fetchWaitlist);
  const fetchReservations = useAppStore((s) => s.fetchReservations);
  const pushNotification = useAppStore((s) => s.pushNotification);
  const loading = useAppStore((s) => s.loading);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    fetchWaitlist();
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 3);
    const end = new Date(now);
    end.setDate(end.getDate() + 3);
    fetchReservations({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    });
  }, [fetchWaitlist, fetchReservations]);

  const waitConfirmMinutes = settings?.waitlistConfirmMinutes || 30;

  const sortedWaitlist = [...waitlist].sort((a, b) => {
    const statusOrder: Record<WaitlistItem['status'], number> = {
      notified: 0, confirmed: 1, waiting: 2, converted: 3, skipped: 4, cancelled: 5,
    };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    if ((a.status === 'waiting' || a.status === 'notified') && a.status === b.status) {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const getShipper = (id: string): Shipper | undefined =>
    quotaOverview?.shippers.find((s: Shipper) => s.id === id);

  const handleConfirm = async (item: WaitlistItem) => {
    setSubmitting(item.id);
    const res = await api.waitlist.confirm(item.id);
    setSubmitting(null);
    if (res.success) {
      pushNotification({
        type: 'success', title: '候补确认成功',
        message: `车辆 ${item.vehicleNo} 已确认补位，自动创建预约`,
      });
      await Promise.all([fetchWaitlist(), fetchReservations()]);
    } else {
      pushNotification({ type: 'error', title: '确认失败', message: res.message });
    }
  };

  const handleSkip = async (item: WaitlistItem) => {
    setSubmitting(item.id);
    const res = await api.waitlist.skip(item.id, '用户主动跳过');
    setSubmitting(null);
    if (res.success) {
      pushNotification({
        type: 'info', title: '已跳过并通知下一位',
        message: res.data?.nextItem ? `下一位：${res.data.nextItem.vehicleNo}` : '暂无更多候补',
      });
      await Promise.all([fetchWaitlist(), fetchReservations()]);
    } else {
      pushNotification({ type: 'error', title: '操作失败', message: res.message });
    }
  };

  const handleCancel = async (item: WaitlistItem) => {
    setSubmitting(item.id);
    const res = await api.waitlist.remove(item.id);
    setSubmitting(null);
    if (res.success) {
      pushNotification({ type: 'success', title: '已取消候补' });
      fetchWaitlist();
    } else {
      pushNotification({ type: 'error', title: '操作失败', message: res.message });
    }
  };

  const waitingCount = waitlist.filter((w) => w.status === 'waiting').length;
  const notifiedCount = waitlist.filter((w) => w.status === 'notified').length;
  const convertedCount = waitlist.filter((w) => w.status === 'converted').length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-accent-500 to-warning rounded-xl flex items-center justify-center shadow-lg shadow-accent-500/30">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-neutral-800">候补补位队列</h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              自动通知 · 超时跳过 · 连续补位
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-ghost flex items-center gap-1"
            onClick={() => Promise.all([fetchWaitlist(), fetchReservations()])}
          >
            <RefreshCw className={`w-4 h-4 ${loading.fetchWaitlist ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <button className="btn-accent flex items-center gap-1.5" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" />
            新增候补
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card border-l-4 border-l-primary-500">
          <p className="text-xs text-neutral-500">当前排队</p>
          <p className="font-display font-bold text-2xl text-neutral-800 mt-1">{waitingCount}</p>
          <p className="text-xs text-neutral-400 mt-1">辆待通知</p>
        </div>
        <div className="card border-l-4 border-l-accent-500">
          <p className="text-xs text-neutral-500">待确认</p>
          <p className="font-display font-bold text-2xl text-neutral-800 mt-1">{notifiedCount}</p>
          <p className="text-xs text-accent-500 mt-1">{waitConfirmMinutes}分钟内确认</p>
        </div>
        <div className="card border-l-4 border-l-success">
          <p className="text-xs text-neutral-500">今日补位成功</p>
          <p className="font-display font-bold text-2xl text-neutral-800 mt-1">{convertedCount}</p>
          <p className="text-xs text-success mt-1">辆已转正</p>
        </div>
        <div className="card border-l-4 border-l-warning">
          <p className="text-xs text-neutral-500">确认窗口期</p>
          <p className="font-display font-bold text-2xl text-neutral-800 mt-1">
            {waitConfirmMinutes}<span className="text-base ml-1">分钟</span>
          </p>
          <p className="text-xs text-warning mt-1">超时自动跳过</p>
        </div>
      </div>

      <div className="space-y-3">
        {sortedWaitlist.length === 0 ? (
          <div className="card py-16 text-center">
            <History className="w-14 h-14 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500">暂无候补车辆</p>
            <p className="text-neutral-400 text-sm mt-1">点击右上角「新增候补」登记排队</p>
          </div>
        ) : (
          sortedWaitlist.map((item: WaitlistItem, idx) => (
            <WaitlistCard
              key={item.id}
              item={item}
              index={idx}
              shipper={getShipper(item.shipperId)}
              platforms={platforms}
              reservations={reservations}
              waitConfirmMinutes={waitConfirmMinutes}
              onConfirm={handleConfirm}
              onSkip={handleSkip}
              onCancel={handleCancel}
              submitting={submitting === item.id}
            />
          ))
        )}
      </div>

      <WaitlistModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
