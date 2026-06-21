import { useState, useEffect } from 'react';
import { X, Calendar, Package } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { api } from '../lib/api';
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
              <select
                className="input-field"
                value={shipperId}
                onChange={(e) => setShipperId(e.target.value)}
              >
                <option value="">请选择货主</option>
                {shippers.map((s: Shipper) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (剩余{s.quota - s.usedQuota - s.frozenQuota})
                  </option>
                ))}
              </select>
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
          <button className="btn-primary" onClick={handleSubmit}>
            创建预约
          </button>
        </div>
      </div>
    </div>
  );
}
