import { useState, useEffect, useMemo } from 'react';
import { Users, Coffee, Briefcase, CalendarX, Truck, Clock, MapPin, User, Layers } from 'lucide-react';
import type { Reservation, Platform, Shipper, Worker } from '../../shared/types';
import { useAppStore } from '../store/appStore';
import StatusBadge from '../components/StatusBadge';
import DispatchModal from '../components/DispatchModal';
import { cn } from '../lib/utils';

export default function Dispatch() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  const workers = useAppStore(s => s.workers);
  const reservations = useAppStore(s => s.reservations);
  const platforms = useAppStore(s => s.platforms);
  const quotaOverview = useAppStore(s => s.quotaOverview);
  const fetchAll = useAppStore(s => s.fetchAll);

  const groups = useMemo(() => {
    const groupSet = new Set(workers.map(w => w.group));
    return Array.from(groupSet).sort();
  }, [workers]);

  const groupStats = useMemo(() => {
    const stats: Record<string, { total: number; idle: number; busy: number; leave: number; todayTasks: number }> = {};
    workers.forEach(w => {
      if (!stats[w.group]) {
        stats[w.group] = { total: 0, idle: 0, busy: 0, leave: 0, todayTasks: 0 };
      }
      stats[w.group].total++;
      stats[w.group][w.status as 'idle' | 'busy' | 'leave']++;
      stats[w.group].todayTasks += w.todayTasks;
    });
    return stats;
  }, [workers]);

  const filteredWorkers = useMemo(() => {
    if (selectedGroup === 'all') return workers;
    return workers.filter(w => w.group === selectedGroup);
  }, [workers, selectedGroup]);

  useEffect(() => {
    fetchAll();
  }, []);

  const totalCount = workers.length;
  const idleCount = workers.filter(w => w.status === 'idle').length;
  const busyCount = workers.filter(w => w.status === 'busy').length;
  const leaveCount = workers.filter(w => w.status === 'leave').length;

  const unassignedReservations = reservations.filter(
    r => (r.status === 'confirmed' || r.status === 'loading') && (!r.workerIds || r.workerIds.length === 0)
  );

  const getWorkerBorderColor = (status: string) => {
    switch (status) {
      case 'idle': return 'border-l-4 border-success';
      case 'busy': return 'border-l-4 border-accent-500';
      case 'leave': return 'border-l-4 border-neutral-400';
      default: return '';
    }
  };

  const getWorkerBgColor = (status: string) => {
    switch (status) {
      case 'idle': return 'bg-success/15 text-success';
      case 'busy': return 'bg-accent-500/15 text-accent-500';
      case 'leave': return 'bg-neutral-200 text-neutral-500';
      default: return 'bg-neutral-100 text-neutral-500';
    }
  };

  const getCurrentTask = (workerId: string) => {
    return reservations.find(
      r => r.workerIds?.includes(workerId) && (r.status === 'loading' || r.status === 'confirmed')
    );
  };

  const formatTime = (t: string) => {
    const d = new Date(t);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const getPlatform = (id: string): Platform | undefined => platforms.find(p => p.id === id);
  const getShipper = (id: string): Shipper | undefined => quotaOverview?.shippers.find(s => s.id === id);

  const openDispatchModal = (r: Reservation) => {
    setSelectedReservation(r);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">总人数</p>
              <p className="text-3xl font-display font-bold text-neutral-800 mt-1">{totalCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-500" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">空闲人数</p>
              <p className="text-3xl font-display font-bold text-success mt-1">{idleCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-success/15 flex items-center justify-center">
              <Coffee className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">作业中人数</p>
              <p className="text-3xl font-display font-bold text-accent-500 mt-1">{busyCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent-500/15 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-accent-500" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">请假人数</p>
              <p className="text-3xl font-display font-bold text-neutral-500 mt-1">{leaveCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-neutral-200 flex items-center justify-center">
              <CalendarX className="w-6 h-6 text-neutral-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-primary-500" />
          <h3 className="font-display font-semibold text-lg text-neutral-800">班组统计</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {groups.map(group => {
            const stats = groupStats[group];
            return (
              <div key={group} className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4 hover:bg-primary-50/30 hover:border-primary-200 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-display font-bold text-lg text-neutral-800">{group}组</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-500 font-medium">
                    {stats.total}人
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div className="text-center">
                    <p className="font-bold text-success text-lg">{stats.idle}</p>
                    <p className="text-neutral-500">空闲</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-accent-500 text-lg">{stats.busy}</p>
                    <p className="text-neutral-500">作业中</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-neutral-500 text-lg">{stats.leave}</p>
                    <p className="text-neutral-500">请假</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-200">
                  <span className="text-neutral-500">今日完成</span>
                  <span className="font-semibold text-neutral-700">{stats.todayTasks} 单</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-display font-semibold text-lg text-neutral-800">装卸工状态</h3>
          <div className="flex items-center gap-2 flex-wrap">
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
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredWorkers.map(worker => {
            const currentTask = getCurrentTask(worker.id);
            const taskPlatform = currentTask ? getPlatform(currentTask.platformId) : null;
            const taskShipper = currentTask ? getShipper(currentTask.shipperId) : null;
            return (
              <div
                key={worker.id}
                className={`rounded-lg border border-neutral-200 bg-white p-4 transition-all duration-200 hover:shadow-card-hover ${getWorkerBorderColor(worker.status)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg ${getWorkerBgColor(worker.status)}`}>
                      {worker.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-800">{worker.name}</p>
                      <p className="text-xs text-neutral-500 flex items-center gap-1">
                        <User className="w-3 h-3" /> {worker.group}组
                      </p>
                    </div>
                  </div>
                  <StatusBadge type="worker" status={worker.status} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">今日完成</span>
                  <span className="font-semibold text-neutral-800">{worker.todayTasks} 单</span>
                </div>
                {currentTask && (
                  <div className="mt-3 pt-3 border-t border-neutral-100 space-y-1">
                    <div className="text-xs text-neutral-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {taskPlatform?.code} · {taskShipper?.name}
                    </div>
                    <div className="text-xs text-neutral-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatTime(currentTask.startTime)} - {formatTime(currentTask.endTime)}
                    </div>
                    <div className="text-xs font-medium text-accent-500">{currentTask.vehicleNo}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-lg text-neutral-800">待派工预约</h3>
          <span className="text-sm text-neutral-500">共 {unassignedReservations.length} 条</span>
        </div>
        {unassignedReservations.length === 0 ? (
          <div className="py-16 text-center text-neutral-500 border border-dashed border-neutral-200 rounded-lg">
            <Truck className="w-12 h-12 mx-auto text-neutral-300 mb-2" />
            <p className="text-sm">暂无待派工预约</p>
          </div>
        ) : (
          <div className="space-y-3">
            {unassignedReservations.map(r => {
              const platform = getPlatform(r.platformId);
              const shipper = getShipper(r.shipperId);
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all duration-200"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-lg bg-primary-500/10 flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-primary-500" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-display font-bold text-lg text-neutral-800">{platform?.code}</span>
                        <StatusBadge type="reservation" status={r.status} />
                      </div>
                      <p className="text-sm text-neutral-600">{platform?.name} · {shipper?.name}</p>
                      <p className="text-xs text-neutral-500 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Truck className="w-3 h-3" /> {r.vehicleNo}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatTime(r.startTime)} - {formatTime(r.endTime)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    className="btn-accent"
                    onClick={() => openDispatchModal(r)}
                  >
                    派工
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DispatchModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        reservation={selectedReservation}
      />
    </div>
  );
}
