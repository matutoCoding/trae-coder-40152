import { useState, useEffect, useMemo } from 'react';
import {
  ArrowUpDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Package,
  Plus,
  RefreshCw,
  Truck,
  Upload,
  Warehouse,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import ReservationModal from '../components/ReservationModal';
import ReservationDetailModal from '../components/ReservationDetailModal';
import StatusBadge from '../components/StatusBadge';
import type { Platform, Reservation, Shipper } from '../../shared/types';

const START_HOUR = 6;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;

const statusBgColors: Record<Reservation['status'], string> = {
  pending: 'bg-warning/80 hover:bg-warning',
  confirmed: 'bg-primary-500/80 hover:bg-primary-500',
  loading: 'bg-accent-500/80 hover:bg-accent-500',
  completed: 'bg-success/80 hover:bg-success',
  cancelled: 'bg-neutral-400/80 hover:bg-neutral-400',
  timeout: 'bg-danger/80 hover:bg-danger',
};

const platformTypeLabels: Record<Platform['type'], string> = {
  unload: '卸货',
  load: '装货',
  mixed: '综合',
};

export default function Dashboard() {
  const platforms = useAppStore((s) => s.platforms);
  const reservations = useAppStore((s) => s.reservations);
  const quotaOverview = useAppStore((s) => s.quotaOverview);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const fetchAll = useAppStore((s) => s.fetchAll);
  const fetchReservations = useAppStore((s) => s.fetchReservations);
  const loading = useAppStore((s) => s.loading);

  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [defaultPlatformId, setDefaultPlatformId] = useState<string | undefined>();
  const [defaultStartTime, setDefaultStartTime] = useState<string | undefined>();
  const [defaultEndTime, setDefaultEndTime] = useState<string | undefined>();
  const [hoveredReservation, setHoveredReservation] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    fetchReservations(selectedDate);
  }, [selectedDate, fetchReservations]);

  const shippers: Shipper[] = quotaOverview?.shippers || [];

  const getShipper = (shipperId: string): Shipper | undefined =>
    shippers.find((s: Shipper) => s.id === shipperId);

  const timeSlots = useMemo(() => {
    const slots: number[] = [];
    for (let h = START_HOUR; h <= END_HOUR; h += 2) {
      slots.push(h);
    }
    return slots;
  }, []);

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const getReservationPosition = (r: Reservation) => {
    const start = new Date(r.startTime);
    const end = new Date(r.endTime);
    const startMinutes = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
    const endMinutes = (end.getHours() - START_HOUR) * 60 + end.getMinutes();
    const left = (startMinutes / (TOTAL_HOURS * 60)) * 100;
    const width = Math.max(((endMinutes - startMinutes) / (TOTAL_HOURS * 60)) * 100, 2);
    return { left, width };
  };

  const handleEmptySlotClick = (
    platformId: string,
    clickXPercent: number,
    e: React.MouseEvent
  ) => {
    const totalMinutes = TOTAL_HOURS * 60;
    const clickedMinutes = (clickXPercent / 100) * totalMinutes;
    let startHour = START_HOUR + Math.floor(clickedMinutes / 60);
    let startMin = Math.floor((clickedMinutes % 60) / 30) * 30;
    if (startHour >= END_HOUR) {
      startHour = END_HOUR - 1;
      startMin = 0;
    }
    let endHour = startHour + 1;
    let endMin = startMin;
    if (endHour > END_HOUR) {
      endHour = END_HOUR;
      endMin = 0;
    }
    const startTime = `${startHour.toString().padStart(2, '0')}:${startMin
      .toString()
      .padStart(2, '0')}`;
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMin
      .toString()
      .padStart(2, '0')}`;
    setDefaultPlatformId(platformId);
    setDefaultStartTime(startTime);
    setDefaultEndTime(endTime);
    setReservationModalOpen(true);
  };

  const handleReservationClick = (r: Reservation) => {
    setSelectedReservation(r);
    setDetailModalOpen(true);
  };

  const handleNewReservation = () => {
    setDefaultPlatformId(undefined);
    setDefaultStartTime(undefined);
    setDefaultEndTime(undefined);
    setReservationModalOpen(true);
  };

  const totalQuota = quotaOverview?.totalQuota || 0;
  const totalUsed = quotaOverview?.totalUsed || 0;
  const totalFrozen = quotaOverview?.totalFrozen || 0;
  const totalAvailable = quotaOverview?.totalAvailable || totalQuota - totalUsed - totalFrozen;
  const usedPercent = totalQuota > 0 ? ((totalUsed + totalFrozen) / totalQuota) * 100 : 0;

  const platformReservations = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    reservations.forEach((r) => {
      if (!map[r.platformId]) map[r.platformId] = [];
      map[r.platformId].push(r);
    });
    return map;
  }, [reservations]);

  const hoveredReservationData = hoveredReservation
    ? reservations.find((r) => r.id === hoveredReservation)
    : null;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Quota Summary */}
      <div className="card bg-gradient-to-r from-primary-500 via-primary-400 to-primary-500 border-0 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Warehouse className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl">园区总览</h2>
              <p className="text-primary-100 text-sm">实时调度与额度监控</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              onClick={() => fetchAll()}
            >
              <RefreshCw className={`w-5 h-5 ${loading.fetchAll ? 'animate-spin' : ''}`} />
            </button>
            <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 mt-5">
          <div>
            <p className="text-primary-100 text-xs">总额度</p>
            <p className="font-display font-bold text-3xl mt-1">{totalQuota}</p>
            <p className="text-primary-200 text-xs mt-0.5">车次/日</p>
          </div>
          <div>
            <p className="text-primary-100 text-xs">已使用</p>
            <p className="font-display font-bold text-3xl mt-1 text-warning">{totalUsed}</p>
            <p className="text-primary-200 text-xs mt-0.5">在途+进行中</p>
          </div>
          <div>
            <p className="text-primary-100 text-xs">已冻结</p>
            <p className="font-display font-bold text-3xl mt-1 text-accent-500">{totalFrozen}</p>
            <p className="text-primary-200 text-xs mt-0.5">待到港</p>
          </div>
          <div>
            <p className="text-primary-100 text-xs">剩余可用</p>
            <p className="font-display font-bold text-3xl mt-1 text-success">{totalAvailable}</p>
            <p className="text-primary-200 text-xs mt-0.5">可预约额度</p>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-primary-100 mb-2">
            <span>使用率 {usedPercent.toFixed(1)}%</span>
            <span>
              {totalUsed + totalFrozen} / {totalQuota}
            </span>
          </div>
          <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-warning via-accent-500 to-danger rounded-full transition-all duration-500" style={{ width: `${usedPercent}%` }} />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1">
              <button
                className="p-2 rounded-md hover:bg-white hover:shadow-sm transition-all"
                onClick={() => changeDate(-1)}
              >
                <ChevronLeft className="w-4 h-4 text-neutral-600" />
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5">
                <Calendar className="w-4 h-4 text-primary-500" />
                <span className="font-medium text-neutral-800">{formatDateDisplay(selectedDate)}</span>
              </div>
              <button
                className="p-2 rounded-md hover:bg-white hover:shadow-sm transition-all"
                onClick={() => changeDate(1)}
              >
                <ChevronRight className="w-4 h-4 text-neutral-600" />
              </button>
            </div>
            <input
              type="date"
              className="input-field w-auto"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <button
              className="btn-ghost flex items-center gap-1"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            >
              <ArrowUpDown className="w-4 h-4" />
              今天
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-outline flex items-center gap-1.5">
              <Upload className="w-4 h-4" />
              导入
            </button>
            <button className="btn-primary flex items-center gap-1.5" onClick={handleNewReservation}>
              <Plus className="w-4 h-4" />
              新建预约
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-neutral-100">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-xs text-neutral-600">待到港</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-primary-500" />
            <span className="text-xs text-neutral-600">已到港</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-accent-500" />
            <span className="text-xs text-neutral-600">装卸中</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-success" />
            <span className="text-xs text-neutral-600">已完成</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-neutral-400" />
            <span className="text-xs text-neutral-600">已取消</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-danger" />
            <span className="text-xs text-neutral-600">已超时</span>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Time Axis */}
            <div className="flex border-b border-neutral-200 bg-neutral-50">
              <div className="w-48 flex-shrink-0 px-4 py-3 border-r border-neutral-200">
                <p className="text-xs font-medium text-neutral-500">月台</p>
              </div>
              <div className="flex-1 relative">
                <div className="flex">
                  {timeSlots.map((hour) => (
                    <div
                      key={hour}
                      className="flex-1 px-2 py-3 text-center border-r border-neutral-100 last:border-r-0"
                    >
                      <span className="text-xs font-medium text-neutral-500">
                        {hour.toString().padStart(2, '0')}:00
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Platform Rows */}
            <div>
              {platforms.length === 0 ? (
                <div className="p-12 text-center text-neutral-500">
                  <Warehouse className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
                  <p className="text-sm">暂无月台数据</p>
                </div>
              ) : (
                platforms.map((platform: Platform) => {
                  const rowReservations = platformReservations[platform.id] || [];
                  return (
                    <div
                      key={platform.id}
                      className="flex border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50/50 transition-colors"
                    >
                      {/* Platform Label */}
                      <div className="w-48 flex-shrink-0 px-4 py-3 border-r border-neutral-200 bg-white">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              platform.type === 'unload'
                                ? 'bg-primary-500/10 text-primary-500'
                                : platform.type === 'load'
                                ? 'bg-accent-500/10 text-accent-500'
                                : 'bg-success/10 text-success'
                            }`}
                          >
                            {platform.type === 'unload' ? (
                              <Download className="w-4 h-4" />
                            ) : platform.type === 'load' ? (
                              <Upload className="w-4 h-4" />
                            ) : (
                              <Package className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-neutral-800 truncate">
                              {platform.code}
                            </p>
                            <p className="text-xs text-neutral-500 truncate">
                              {platform.name} · {platformTypeLabels[platform.type]}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Timeline */}
                      <div
                        className="flex-1 relative h-16 cursor-pointer"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
                          handleEmptySlotClick(platform.id, xPercent, e);
                        }}
                      >
                        {/* Grid Lines */}
                        <div className="absolute inset-0 flex">
                          {timeSlots.map((_, idx) => (
                            <div
                              key={idx}
                              className="flex-1 border-r border-neutral-100 last:border-r-0"
                            />
                          ))}
                        </div>

                        {/* Current Time Line */}
                        {(() => {
                          const now = new Date();
                          const todayStr = now.toISOString().split('T')[0];
                          if (todayStr !== selectedDate) return null;
                          const minutes = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
                          if (minutes < 0 || minutes > TOTAL_HOURS * 60) return null;
                          const left = (minutes / (TOTAL_HOURS * 60)) * 100;
                          return (
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-danger z-10 pointer-events-none"
                              style={{ left: `${left}%` }}
                            >
                              <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-danger rounded-full animate-pulse-slow" />
                            </div>
                          );
                        })()}

                        {/* Reservation Blocks */}
                        {rowReservations.map((r) => {
                          const { left, width } = getReservationPosition(r);
                          const isHovered = hoveredReservation === r.id;
                          return (
                            <div
                              key={r.id}
                              className={`absolute top-2 bottom-2 rounded-md ${statusBgColors[r.status]} text-white text-xs px-2 py-1 overflow-hidden cursor-pointer shadow-sm transition-all duration-150 ${isHovered ? 'scale-y-[1.08] z-20 shadow-md' : 'z-10'}`}
                              style={{ left: `${left}%`, width: `${width}%` }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReservationClick(r);
                              }}
                              onMouseEnter={(e) => {
                                setHoveredReservation(r.id);
                                const rect = e.currentTarget.getBoundingClientRect();
                                setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
                              }}
                              onMouseLeave={() => setHoveredReservation(null)}
                            >
                              <div className="flex items-center gap-1 h-full">
                                <Truck className="w-3 h-3 flex-shrink-0" />
                                <span className="font-semibold truncate flex-shrink-0">
                                  {r.vehicleNo}
                                </span>
                                {width > 15 && (
                                  <>
                                    <span className="opacity-80 truncate">
                                      {getShipper(r.shipperId)?.name || ''}
                                    </span>
                                    <StatusBadge type="reservation" status={r.status} />
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredReservationData && (
        <div
          className="fixed z-50 pointer-events-none animate-fade-in"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-neutral-800 text-white rounded-lg shadow-xl p-3 w-64">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">{hoveredReservationData.vehicleNo}</span>
              <StatusBadge type="reservation" status={hoveredReservationData.status} />
            </div>
            <div className="space-y-1 text-xs text-neutral-300">
              <p>
                <span className="text-neutral-400">货主：</span>
                {getShipper(hoveredReservationData.shipperId)?.name || '-'}
              </p>
              <p>
                <span className="text-neutral-400">时间：</span>
                {new Date(hoveredReservationData.startTime).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                -{' '}
                {new Date(hoveredReservationData.endTime).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <p>
                <span className="text-neutral-400">车型：</span>
                {hoveredReservationData.vehicleType}
              </p>
              <p>
                <span className="text-neutral-400">货物：</span>
                {hoveredReservationData.cargoType} · {hoveredReservationData.cargoWeight}吨
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ReservationModal
        open={reservationModalOpen}
        onClose={() => setReservationModalOpen(false)}
        defaultPlatformId={defaultPlatformId}
        defaultStartTime={defaultStartTime}
        defaultEndTime={defaultEndTime}
      />
      <ReservationDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        reservation={selectedReservation}
      />
    </div>
  );
}
