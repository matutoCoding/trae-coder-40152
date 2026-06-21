import { useState, useEffect } from 'react';
import { X, Calendar, Package, Wallet, TrendingDown, Lock, Unlock } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import type { Platform, Shipper } from '../../shared/types';

interface Props {
  open: boolean;
  onClose: () => void;
  defaultPlatformId?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
}

export default function ReservationModal({
  open,
  onClose,
  defaultPlatformId,
  defaultStartTime,
  defaultEndTime,
}: Props) {
  const platforms = useAppStore((s) => s.platforms);
  const quotaOverview = useAppStore((s) => s.quotaOverview);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const pushNotification = useAppStore((s) => s.pushNotification);
  const fetchReservations = useAppStore((s) => s.fetchReservations);
  const fetchQuota = useAppStore((s) => s.fetchQuota);
  const setLoading = useAppStore((s) => s.setLoading);

  const [platformId, setPlatformId] = useState('');
  const [shipperId, setShipperId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [cargoType, setCargoType] = useState('');
  const [cargoWeight, setCargoWeight] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setPlatformId(defaultPlatformId || '');
      setShipperId('');
      setStartTime(defaultStartTime || '08:00');
      setEndTime(defaultEndTime || '10:00');
      setVehicleNo('');
      setVehicleType('');
      setCargoType('');
      setCargoWeight('');
      setErrors({});
    }
  }, [open, defaultPlatformId, defaultStartTime, defaultEndTime]);

  if (!open) return null;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!platformId) e.platformId = '请选择月台';
    if (!shipperId) e.shipperId = '请选择货主';
    if (!startTime) e.startTime = '请选择开始时间';
    if (!endTime) e.endTime = '请选择结束时间';
    if (startTime && endTime && startTime >= endTime) e.endTime = '结束时间必须晚于开始时间';
    if (!vehicleNo.trim()) e.vehicleNo = '请输入车牌号';
    if (!vehicleType.trim()) e.vehicleType = '请输入车型';
    if (!cargoType.trim()) e.cargoType = '请输入货物类型';
    if (!cargoWeight) e.cargoWeight = '请输入货物重量';
    if (cargoWeight && Number(cargoWeight) <= 0) e.cargoWeight = '货物重量必须大于0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading('createReservation', true);
    const startISO = `${selectedDate}T${startTime}:00`;
    const endISO = `${selectedDate}T${endTime}:00`;
    const res = await api.reservations.create({
      platformId,
      shipperId,
      startTime: startISO,
      endTime: endISO,
      vehicleNo: vehicleNo.trim(),
      vehicleType: vehicleType.trim(),
      cargoType: cargoType.trim(),
      cargoWeight: Number(cargoWeight),
    });
    setLoading('createReservation', false);
    if (res.success) {
      pushNotification({ type: 'success', title: '预约创建成功', message: `车牌 ${vehicleNo} 已成功预约` });
      fetchReservations();
      fetchQuota();
      onClose();
    } else {
      pushNotification({ type: 'error', title: '预约创建失败', message: res.message });
    }
  };

  const shippers: Shipper[] = quotaOverview?.shippers || [];
  const selectedShipper = shippers.find((s: Shipper) => s.id === shipperId);
  const isQuotaInsufficient = !!selectedShipper && selectedShipper.available <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-[520px] max-h-[90vh] overflow-auto animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary-500/10 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-neutral-800">新建预约</h3>
              <p className="text-xs text-neutral-500">{selectedDate}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">月台</label>
              <select
                className="input-field"
                value={platformId}
                onChange={(e) => setPlatformId(e.target.value)}
              >
                <option value="">请选择月台</option>
                {platforms
                  .filter((p: Platform) => p.status === 'active')
                  .map((p: Platform) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </option>
                  ))}
              </select>
              {errors.platformId && <p className="text-xs text-danger mt-1">{errors.platformId}</p>}
            </div>
            <div>
              <label className="label-field">货主</label>
              {!quotaOverview ? (
                <div className="input-field flex items-center justify-center text-neutral-400">
                  <svg className="animate-spin w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  加载中...
                </div>
              ) : (
                <>
                  <select
                    className="input-field"
                    value={shipperId}
                    onChange={(e) => setShipperId(e.target.value)}
                  >
                    <option value="">请选择货主</option>
                    {shippers.map((s: Shipper) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (剩余{s.available})
                      </option>
                    ))}
                  </select>
                  {shipperId && (() => {
                    const shipper = shippers.find((s: Shipper) => s.id === shipperId);
                    if (!shipper) return null;
                    return (
                      <div className="mt-2 p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div className="text-center">
                            <div className="flex items-center justify-center w-7 h-7 mx-auto rounded-lg bg-primary-500/10 mb-1">
                              <Wallet className="w-3.5 h-3.5 text-primary-500" />
                            </div>
                            <p className="text-neutral-500 mb-0.5">总额</p>
                            <p className="font-semibold text-neutral-800">{shipper.quota}</p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center w-7 h-7 mx-auto rounded-lg bg-danger/10 mb-1">
                              <TrendingDown className="w-3.5 h-3.5 text-danger" />
                            </div>
                            <p className="text-neutral-500 mb-0.5">已用</p>
                            <p className="font-semibold text-danger">{shipper.used}</p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center w-7 h-7 mx-auto rounded-lg mb-1" style={{ backgroundColor: 'rgba(253, 203, 110, 0.2)' }}>
                              <Lock className="w-3.5 h-3.5" style={{ color: '#c9972b' }} />
                            </div>
                            <p className="text-neutral-500 mb-0.5">冻结</p>
                            <p className="font-semibold" style={{ color: '#c9972b' }}>{shipper.frozen}</p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center w-7 h-7 mx-auto rounded-lg bg-success/10 mb-1">
                              <Unlock className="w-3.5 h-3.5 text-success" />
                            </div>
                            <p className="text-neutral-500 mb-0.5">剩余</p>
                            <p className={cn('font-semibold', shipper.available === 0 ? 'text-danger' : 'text-success')}>{shipper.available}</p>
                          </div>
                        </div>
                        {shipper.available === 0 && (
                          <p className="text-xs text-danger mt-2 text-center">该货主可用额度已用尽</p>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
              {errors.shipperId && <p className="text-xs text-danger mt-1">{errors.shipperId}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">开始时间</label>
              <input
                type="time"
                className="input-field"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                min="06:00"
                max="22:00"
              />
              {errors.startTime && <p className="text-xs text-danger mt-1">{errors.startTime}</p>}
            </div>
            <div>
              <label className="label-field">结束时间</label>
              <input
                type="time"
                className="input-field"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                min="06:00"
                max="22:00"
              />
              {errors.endTime && <p className="text-xs text-danger mt-1">{errors.endTime}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">车牌号</label>
              <input
                type="text"
                className="input-field"
                placeholder="例如：沪A12345"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
              />
              {errors.vehicleNo && <p className="text-xs text-danger mt-1">{errors.vehicleNo}</p>}
            </div>
            <div>
              <label className="label-field">车型</label>
              <input
                type="text"
                className="input-field"
                placeholder="例如：9.6米厢车"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
              />
              {errors.vehicleType && <p className="text-xs text-danger mt-1">{errors.vehicleType}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">货物类型</label>
              <div className="relative">
                <Package className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  className="input-field pl-9"
                  placeholder="例如：电子产品"
                  value={cargoType}
                  onChange={(e) => setCargoType(e.target.value)}
                />
              </div>
              {errors.cargoType && <p className="text-xs text-danger mt-1">{errors.cargoType}</p>}
            </div>
            <div>
              <label className="label-field">货物重量 (吨)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="input-field"
                placeholder="例如：5.5"
                value={cargoWeight}
                onChange={(e) => setCargoWeight(e.target.value)}
              />
              {errors.cargoWeight && <p className="text-xs text-danger mt-1">{errors.cargoWeight}</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-neutral-200 bg-neutral-50">
          <button className="btn-outline" onClick={onClose}>
            取消
          </button>
          <button
            className={cn('btn-primary', isQuotaInsufficient && 'opacity-50 cursor-not-allowed')}
            onClick={handleSubmit}
            disabled={isQuotaInsufficient}
            title={isQuotaInsufficient ? '可用额度不足' : ''}
          >
            {isQuotaInsufficient ? '额度不足' : '创建预约'}
          </button>
        </div>
      </div>
    </div>
  );
}
