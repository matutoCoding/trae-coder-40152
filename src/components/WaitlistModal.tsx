import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
}

const today = new Date().toISOString().split('T')[0];

export default function WaitlistModal({ open, onClose }: Props) {
  const shippers = useAppStore(s => s.quotaOverview?.shippers || []);
  const fetchWaitlist = useAppStore(s => s.fetchWaitlist);
  const pushNotification = useAppStore(s => s.pushNotification);

  const [shipperId, setShipperId] = useState('');
  const [targetDate, setTargetDate] = useState(today);
  const [priority, setPriority] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [vehicleNo, setVehicleNo] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [cargoType, setCargoType] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setShipperId(shippers[0]?.id || '');
      setTargetDate(today);
      setPriority(3);
      setVehicleNo('');
      setVehicleType('');
      setCargoType('');
    }
  }, [open, shippers]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipperId || !targetDate || !vehicleNo || !vehicleType || !cargoType) {
      pushNotification({ type: 'warning', title: '请填写完整信息', message: '请填写所有必填字段' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.waitlist.create({
        shipperId,
        targetDate,
        priority,
        vehicleNo,
        vehicleType,
        cargoType,
      });
      if (res.success) {
        pushNotification({ type: 'success', title: '候补登记成功', message: `车牌号 ${vehicleNo} 已加入候补队列` });
        await fetchWaitlist();
        onClose();
      } else {
        pushNotification({ type: 'error', title: '候补登记失败', message: res.message });
      }
    } catch (err) {
      pushNotification({ type: 'error', title: '候补登记失败', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const priorityColors: Record<number, string> = {
    1: 'bg-neutral-100 text-neutral-600 border-neutral-300',
    2: 'bg-blue-50 text-blue-600 border-blue-300',
    3: 'bg-primary-500/10 text-primary-500 border-primary-500/30',
    4: 'bg-accent-500/20 text-accent-500 border-accent-500/40',
    5: 'bg-danger/20 text-danger border-danger/40',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-card-hover w-full max-w-md mx-4 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h3 className="font-display font-semibold text-lg text-neutral-800">登记候补</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">货主 <span className="text-danger">*</span></label>
            <select
              value={shipperId}
              onChange={e => setShipperId(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
            >
              {shippers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">目标日期 <span className="text-danger">*</span></label>
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              min={today}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              优先级 <span className="text-danger">*</span>
              <span className="ml-2 font-normal text-neutral-500">(1-5，5最高)</span>
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p as 1 | 2 | 3 | 4 | 5)}
                  className={cn(
                    'flex-1 py-2 rounded-lg border-2 font-semibold text-sm transition-all',
                    priority === p
                      ? cn(priorityColors[p], 'border-2 scale-105 shadow-md')
                      : 'bg-white text-neutral-400 border-neutral-200 hover:border-neutral-300 hover:text-neutral-600'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <input
                type="range"
                min="1"
                max="5"
                value={priority}
                onChange={e => setPriority(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                className="w-full accent-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">车牌号 <span className="text-danger">*</span></label>
            <input
              type="text"
              value={vehicleNo}
              onChange={e => setVehicleNo(e.target.value)}
              placeholder="例如：沪A12345"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">车型 <span className="text-danger">*</span></label>
            <select
              value={vehicleType}
              onChange={e => setVehicleType(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
            >
              <option value="">请选择车型</option>
              <option value="厢式货车">厢式货车</option>
              <option value="冷藏车">冷藏车</option>
              <option value="平板货车">平板货车</option>
              <option value="集装箱车">集装箱车</option>
              <option value="其他">其他</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">货物类型 <span className="text-danger">*</span></label>
            <select
              value={cargoType}
              onChange={e => setCargoType(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
            >
              <option value="">请选择货物类型</option>
              <option value="食品">食品</option>
              <option value="冷链货物">冷链货物</option>
              <option value="电子产品">电子产品</option>
              <option value="日用品">日用品</option>
              <option value="建材">建材</option>
              <option value="服装">服装</option>
              <option value="其他">其他</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-neutral-300 text-neutral-700 rounded-lg font-medium hover:bg-neutral-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '提交中...' : '确认登记'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
