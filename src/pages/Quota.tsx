import { useState, useEffect } from 'react';
import { PieChart, Wallet, Lock, Unlock, Edit2, Check, X, TrendingDown, TrendingUp, Minus, User, FileText } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import type { Shipper, QuotaLog } from '../../shared/types';

export default function Quota() {
  const quotaOverview = useAppStore(s => s.quotaOverview);
  const quotaLogs = useAppStore(s => s.quotaLogs);
  const shippers = useAppStore(s => s.quotaOverview?.shippers || []);
  const fetchQuota = useAppStore(s => s.fetchQuota);
  const fetchQuotaLogs = useAppStore(s => s.fetchQuotaLogs);
  const pushNotification = useAppStore(s => s.pushNotification);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuota();
    fetchQuotaLogs();
  }, []);

  const getShipperName = (shipperId: string) => shippers.find(s => s.id === shipperId)?.name || '未知货主';

  const handleStartEdit = (shipper: Shipper) => {
    setEditingId(shipper.id);
    setEditValue(shipper.quota);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue(0);
  };

  const handleSaveEdit = async (shipper: Shipper) => {
    if (editValue < shipper.used + shipper.frozen) {
      pushNotification({
        type: 'warning',
        title: '额度设置过低',
        message: `总额度不能低于已用+冻结 (${shipper.used + shipper.frozen})`
      });
      return;
    }
    if (editValue < 0) {
      pushNotification({ type: 'warning', title: '请输入有效额度', message: '额度不能为负数' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.quota.updateShipper(shipper.id, editValue);
      if (res.success) {
        pushNotification({ type: 'success', title: '额度更新成功', message: `${shipper.name} 总额度已更新为 ${editValue}` });
        await fetchQuota();
        setEditingId(null);
      } else {
        pushNotification({ type: 'error', title: '额度更新失败', message: res.message });
      }
    } catch (err) {
      pushNotification({ type: 'error', title: '额度更新失败', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const logTypeConfig: Record<QuotaLog['type'], { label: string; bg: string; icon: typeof TrendingDown }> = {
    deduct: { label: '扣减', bg: 'bg-danger/10 text-danger', icon: TrendingDown },
    release: { label: '释放', bg: 'bg-success/10 text-success', icon: TrendingUp },
    freeze: { label: '冻结', bg: 'bg-warning/20 text-warning', icon: Lock },
    unfreeze: { label: '解冻', bg: 'bg-accent-500/10 text-accent-500', icon: Unlock },
  };

  const barColors = ['bg-primary-500', 'bg-accent-500', 'bg-success', 'bg-warning', '#6366f1', '#ec4899'];

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day} ${h}:${mi}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
          <PieChart className="w-6 h-6 text-primary-500" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-neutral-800">共享额度池</h1>
          <p className="text-sm text-neutral-500">管理各货主预约额度分配与流水记录</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-card border border-neutral-100">
          <h3 className="font-display font-semibold text-lg text-neutral-800 mb-6">额度概览</h3>
          {quotaOverview && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 rounded-xl bg-neutral-50">
                  <div className="flex items-center justify-center w-10 h-10 mx-auto rounded-lg bg-primary-500/10 mb-2">
                    <Wallet className="w-5 h-5 text-primary-500" />
                  </div>
                  <p className="text-xs text-neutral-500 mb-1">总额度</p>
                  <p className="font-display font-bold text-2xl text-neutral-800">{quotaOverview.totalQuota}</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-neutral-50">
                  <div className="flex items-center justify-center w-10 h-10 mx-auto rounded-lg bg-danger/10 mb-2">
                    <TrendingDown className="w-5 h-5 text-danger" />
                  </div>
                  <p className="text-xs text-neutral-500 mb-1">已用</p>
                  <p className="font-display font-bold text-2xl text-danger">{quotaOverview.totalUsed}</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-neutral-50">
                  <div className="flex items-center justify-center w-10 h-10 mx-auto rounded-lg" style={{ backgroundColor: 'rgba(253, 203, 110, 0.2)' }}>
                    <Lock className="w-5 h-5" style={{ color: '#c9972b' }} />
                  </div>
                  <p className="text-xs text-neutral-500 mb-1">冻结</p>
                  <p className="font-display font-bold text-2xl" style={{ color: '#c9972b' }}>{quotaOverview.totalFrozen}</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-neutral-50">
                  <div className="flex items-center justify-center w-10 h-10 mx-auto rounded-lg bg-success/10 mb-2">
                    <Unlock className="w-5 h-5 text-success" />
                  </div>
                  <p className="text-xs text-neutral-500 mb-1">可用</p>
                  <p className="font-display font-bold text-2xl text-success">{quotaOverview.totalAvailable}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-700">总体使用率</span>
                  <span className="text-sm text-neutral-500">
                    {quotaOverview.totalQuota > 0
                      ? Math.round(((quotaOverview.totalUsed + quotaOverview.totalFrozen) / quotaOverview.totalQuota) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="h-3 bg-neutral-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-danger transition-all duration-500"
                    style={{ width: `${quotaOverview.totalQuota > 0 ? (quotaOverview.totalUsed / quotaOverview.totalQuota) * 100 : 0}%` }}
                  />
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${quotaOverview.totalQuota > 0 ? (quotaOverview.totalFrozen / quotaOverview.totalQuota) * 100 : 0}%`,
                      backgroundColor: '#FDCB6E',
                    }}
                  />
                </div>
                <div className="flex gap-4 mt-2 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-danger" /> 已用
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FDCB6E' }} /> 冻结
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-success" /> 可用
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-card border border-neutral-100">
          <h3 className="font-display font-semibold text-lg text-neutral-800 mb-6">货主额度占用</h3>
          {shippers.length > 0 && quotaOverview && quotaOverview.totalQuota > 0 && (
            <div className="flex flex-col items-center">
              <div className="relative w-44 h-44">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  {(() => {
                    let cumulativePercent = 0;
                    const rings = shippers.map((s, i) => {
                      const percent = (s.used + s.frozen) / quotaOverview.totalQuota * 100;
                      const strokeDasharray = `${percent} ${100 - percent}`;
                      const strokeDashoffset = -cumulativePercent;
                      cumulativePercent += percent;
                      const colors = ['#0F2540', '#FF551A', '#00B894', '#FDCB6E', '#6366f1', '#ec4899'];
                      return (
                        <circle
                          key={s.id}
                          cx="18"
                          cy="18"
                          r="15.9155"
                          fill="transparent"
                          stroke={colors[i % colors.length]}
                          strokeWidth="3.5"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-500"
                        />
                      );
                    });
                    const unusedPercent = 100 - (shippers.reduce((acc, s) => acc + s.used + s.frozen, 0) / quotaOverview.totalQuota * 100);
                    if (unusedPercent > 0) {
                      rings.push(
                        <circle
                          key="unused"
                          cx="18"
                          cy="18"
                          r="15.9155"
                          fill="transparent"
                          stroke="#E9ECEF"
                          strokeWidth="3.5"
                          strokeDasharray={`${unusedPercent} ${100 - unusedPercent}`}
                          strokeDashoffset={-cumulativePercent}
                        />
                      );
                    }
                    return rings;
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-xs text-neutral-500">可用</p>
                  <p className="font-display font-bold text-2xl text-success">
                    {quotaOverview.totalAvailable}
                  </p>
                </div>
              </div>

              <div className="w-full mt-5 space-y-2">
                {shippers.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <span className={cn('w-3 h-3 rounded-full flex-shrink-0', barColors[i % barColors.length])} />
                    <span className="text-xs text-neutral-600 flex-1 truncate">{s.name}</span>
                    <span className="text-xs font-medium text-neutral-800">
                      {s.used + s.frozen}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-card border border-neutral-100">
        <div className="flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-primary-500" />
          <h3 className="font-display font-semibold text-lg text-neutral-800">货主配额列表</h3>
        </div>
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">货主</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">总额度</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">已用</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">冻结</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">剩余</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider min-w-[180px]">使用率</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {shippers.map(shipper => {
                const used = shipper.used + shipper.frozen;
                const usageRate = shipper.quota > 0 ? Math.round((used / shipper.quota) * 100) : 0;
                const isEditing = editingId === shipper.id;
                return (
                  <tr key={shipper.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary-500">{shipper.name[0]}</span>
                        </div>
                        <span className="font-medium text-neutral-800">{shipper.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          min={used}
                          value={editValue}
                          onChange={e => setEditValue(Number(e.target.value))}
                          className="w-20 px-2 py-1 text-right border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                        />
                      ) : (
                        <span className="font-semibold text-neutral-800">{shipper.quota}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-danger">{shipper.used}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span style={{ color: '#c9972b' }}>{shipper.frozen}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-medium text-success">{shipper.available}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              usageRate >= 80 ? 'bg-danger' :
                              usageRate >= 50 ? 'bg-warning' :
                              'bg-success'
                            )}
                            style={{ width: `${Math.min(usageRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-neutral-500 w-10 text-right">{usageRate}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleSaveEdit(shipper)}
                            disabled={submitting}
                            className="p-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={submitting}
                            className="p-1.5 rounded-lg bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition-colors disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(shipper)}
                          className="p-1.5 rounded-lg bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-card border border-neutral-100">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="w-5 h-5 text-primary-500" />
          <h3 className="font-display font-semibold text-lg text-neutral-800">额度流水</h3>
        </div>
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">时间</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">货主</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">类型</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">金额</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">操作人</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">关联预约</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {quotaLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    暂无流水记录
                  </td>
                </tr>
              ) : (
                quotaLogs.map(log => {
                  const cfg = logTypeConfig[log.type];
                  const Icon = cfg.icon;
                  const isPositive = log.type === 'release' || log.type === 'unfreeze';
                  return (
                    <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-3 px-4 text-sm text-neutral-600 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                      <td className="py-3 px-4 text-sm font-medium text-neutral-800">{getShipperName(log.shipperId)}</td>
                      <td className="py-3 px-4">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', cfg.bg)}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className={cn(
                        'py-3 px-4 text-right text-sm font-semibold',
                        isPositive ? 'text-success' : 'text-danger'
                      )}>
                        {isPositive ? '+' : '-'}{log.amount}
                      </td>
                      <td className="py-3 px-4 text-sm text-neutral-600">{log.operator}</td>
                      <td className="py-3 px-4 text-sm text-neutral-500 font-mono text-xs">
                        {log.reservationId || <Minus className="w-4 h-4 inline text-neutral-300" />}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
