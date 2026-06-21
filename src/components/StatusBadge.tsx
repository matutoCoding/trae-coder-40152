import type { Reservation, WaitlistItem, Worker } from '../../shared/types';

const reservationColors: Record<Reservation['status'], string> = {
  pending: 'bg-warning/20 text-warning border border-warning/40',
  confirmed: 'bg-primary-500/10 text-primary-500 border border-primary-500/30',
  loading: 'bg-accent-500/10 text-accent-500 border border-accent-500/30',
  completed: 'bg-success/10 text-success border border-success/30',
  cancelled: 'bg-neutral-200 text-neutral-500 border border-neutral-300',
  timeout: 'bg-danger/10 text-danger border border-danger/30',
};

const reservationLabels: Record<Reservation['status'], string> = {
  pending: '待到港',
  confirmed: '已到港',
  loading: '装卸中',
  completed: '已完成',
  cancelled: '已取消',
  timeout: '已超时',
};

const waitlistColors: Record<WaitlistItem['status'], string> = {
  waiting: 'bg-primary-500/10 text-primary-500 border border-primary-500/30',
  notified: 'bg-accent-500/10 text-accent-500 border border-accent-500/30',
  confirmed: 'bg-success/10 text-success border border-success/30',
  cancelled: 'bg-neutral-200 text-neutral-500 border border-neutral-300',
  converted: 'bg-primary-500/20 text-primary-600 border border-primary-500/40',
  skipped: 'bg-warning/20 text-warning-600 border border-warning/40',
};

const waitlistLabels: Record<WaitlistItem['status'], string> = {
  waiting: '等待中',
  notified: '已通知',
  confirmed: '已确认',
  cancelled: '已取消',
  converted: '已转正',
  skipped: '已跳过',
};

const workerColors: Record<Worker['status'], string> = {
  idle: 'bg-success/10 text-success border border-success/30',
  busy: 'bg-accent-500/10 text-accent-500 border border-accent-500/30',
  leave: 'bg-neutral-200 text-neutral-500 border border-neutral-300',
};

const workerLabels: Record<Worker['status'], string> = {
  idle: '空闲',
  busy: '作业中',
  leave: '请假',
};

interface Props {
  type: 'reservation' | 'waitlist' | 'worker';
  status: string;
}

export default function StatusBadge({ type, status }: Props) {
  const colors = type === 'reservation' ? reservationColors
    : type === 'waitlist' ? waitlistColors
    : workerColors;
  const labels = type === 'reservation' ? reservationLabels
    : type === 'waitlist' ? waitlistLabels
    : workerLabels;
  return (
    <span className={`badge ${colors[status as keyof typeof colors] || 'bg-neutral-100 text-neutral-500'}`}>
      {labels[status as keyof typeof labels] || status}
    </span>
  );
}
