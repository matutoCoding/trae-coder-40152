import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, MapPin, Clock, PieChart, Save } from 'lucide-react';
import type { Platform, SystemSettings } from '../../shared/types';
import { useAppStore } from '../store/appStore';
import { api } from '../lib/api';
import PlatformModal from '../components/PlatformModal';

const typeLabels: Record<Platform['type'], string> = {
  unload: '卸车',
  load: '装车',
  mixed: '混合',
};

const typeColors: Record<Platform['type'], string> = {
  unload: 'bg-primary-500/10 text-primary-500 border border-primary-500/30',
  load: 'bg-accent-500/10 text-accent-500 border border-accent-500/30',
  mixed: 'bg-success/10 text-success border border-success/30',
};

const statusLabels: Record<Platform['status'], string> = {
  active: '启用',
  maintenance: '维护',
};

const statusColors: Record<Platform['status'], string> = {
  active: 'bg-success/10 text-success border border-success/30',
  maintenance: 'bg-warning/20 text-warning border border-warning/40',
};

export default function Settings() {
  const [platformModalOpen, setPlatformModalOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);

  const [timeoutMinutes, setTimeoutMinutes] = useState(30);
  const [waitlistConfirmMinutes, setWaitlistConfirmMinutes] = useState(15);
  const [totalQuota, setTotalQuota] = useState(100);
  const [savingTimeout, setSavingTimeout] = useState(false);
  const [savingWaitlist, setSavingWaitlist] = useState(false);
  const [savingQuota, setSavingQuota] = useState(false);

  const platforms = useAppStore(s => s.platforms);
  const settings = useAppStore(s => s.settings);
  const pushNotification = useAppStore(s => s.pushNotification);
  const fetchPlatforms = useAppStore(s => s.fetchPlatforms);
  const fetchSettings = useAppStore(s => s.fetchSettings);

  useEffect(() => {
    fetchPlatforms();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      setTimeoutMinutes(settings.timeoutMinutes);
      setWaitlistConfirmMinutes(settings.waitlistConfirmMinutes);
      setTotalQuota(settings.totalQuota);
    }
  }, [settings]);

  const handleAddPlatform = () => {
    setEditingPlatform(null);
    setPlatformModalOpen(true);
  };

  const handleEditPlatform = (p: Platform) => {
    setEditingPlatform(p);
    setPlatformModalOpen(true);
  };

  const handleDeletePlatform = async (p: Platform) => {
    if (!confirm(`确定删除月台 ${p.code} ${p.name}？`)) return;
    try {
      const res = await api.platforms.remove(p.id);
      if (res.success) {
        pushNotification({ type: 'success', title: '月台已删除', message: `${p.code} ${p.name}` });
        await fetchPlatforms();
      } else {
        pushNotification({ type: 'error', title: '删除失败', message: res.message });
      }
    } catch (e) {
      pushNotification({ type: 'error', title: '删除失败', message: (e as Error).message });
    }
  };

  const saveSetting = async (
    key: keyof SystemSettings,
    value: number,
    setSaving: (v: boolean) => void,
    successTitle: string
  ) => {
    if (value <= 0) {
      pushNotification({ type: 'warning', title: '请输入有效数值', message: '必须为正数' });
      return;
    }
    setSaving(true);
    try {
      const res = await api.settings.update({ [key]: value });
      if (res.success) {
        pushNotification({ type: 'success', title: successTitle });
        await fetchSettings();
      } else {
        pushNotification({ type: 'error', title: '保存失败', message: res.message });
      }
    } catch (e) {
      pushNotification({ type: 'error', title: '保存失败', message: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary-500" />
            </div>
            <h3 className="font-display font-semibold text-lg text-neutral-800">月台建档</h3>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={handleAddPlatform}>
            <Plus className="w-4 h-4" /> 新增月台
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="text-left py-3 px-4 font-semibold text-neutral-700">编号</th>
                <th className="text-left py-3 px-4 font-semibold text-neutral-700">名称</th>
                <th className="text-left py-3 px-4 font-semibold text-neutral-700">类型</th>
                <th className="text-left py-3 px-4 font-semibold text-neutral-700">承重限制</th>
                <th className="text-left py-3 px-4 font-semibold text-neutral-700">状态</th>
                <th className="text-right py-3 px-4 font-semibold text-neutral-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {platforms.map(p => (
                <tr key={p.id} className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-neutral-800">{p.code}</td>
                  <td className="py-3 px-4 text-neutral-700">{p.name}</td>
                  <td className="py-3 px-4">
                    <span className={`badge ${typeColors[p.type]}`}>{typeLabels[p.type]}</span>
                  </td>
                  <td className="py-3 px-4 text-neutral-700">{p.weightLimit} 吨</td>
                  <td className="py-3 px-4">
                    <span className={`badge ${statusColors[p.status]}`}>{statusLabels[p.status]}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="p-1.5 rounded-md hover:bg-primary-50 text-primary-500 transition-colors"
                        onClick={() => handleEditPlatform(p)}
                        title="编辑"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1.5 rounded-md hover:bg-danger/10 text-danger transition-colors"
                        onClick={() => handleDeletePlatform(p)}
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {platforms.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500 text-sm">
                    暂无月台数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-9 h-9 rounded-lg bg-accent-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-accent-500" />
            </div>
            <h3 className="font-display font-semibold text-lg text-neutral-800">超时规则配置</h3>
          </div>
          <div className="space-y-5">
            <div>
              <label className="label-field">超时未到自动释放（分钟）</label>
              <div className="flex gap-3">
                <input
                  type="number"
                  min={1}
                  className="input-field flex-1"
                  value={timeoutMinutes}
                  onChange={e => setTimeoutMinutes(Number(e.target.value))}
                />
                <button
                  className="btn-accent flex items-center gap-2 min-w-[100px] justify-center"
                  onClick={() => saveSetting('timeoutMinutes', timeoutMinutes, setSavingTimeout, '超时规则已保存')}
                  disabled={savingTimeout}
                >
                  {savingTimeout ? '保存中' : (<><Save className="w-4 h-4" /> 保存</>)}
                </button>
              </div>
              <p className="text-xs text-neutral-500 mt-1.5">预约车辆超过此时限未到港，将自动释放月台配额</p>
            </div>
            <div>
              <label className="label-field">候补确认窗口（分钟）</label>
              <div className="flex gap-3">
                <input
                  type="number"
                  min={1}
                  className="input-field flex-1"
                  value={waitlistConfirmMinutes}
                  onChange={e => setWaitlistConfirmMinutes(Number(e.target.value))}
                />
                <button
                  className="btn-accent flex items-center gap-2 min-w-[100px] justify-center"
                  onClick={() => saveSetting('waitlistConfirmMinutes', waitlistConfirmMinutes, setSavingWaitlist, '候补规则已保存')}
                  disabled={savingWaitlist}
                >
                  {savingWaitlist ? '保存中' : (<><Save className="w-4 h-4" /> 保存</>)}
                </button>
              </div>
              <p className="text-xs text-neutral-500 mt-1.5">候补队伍被通知后，在此时间内未确认则自动跳过</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
              <PieChart className="w-5 h-5 text-success" />
            </div>
            <h3 className="font-display font-semibold text-lg text-neutral-800">额度策略配置</h3>
          </div>
          <div>
            <label className="label-field">园区总额度</label>
            <div className="flex gap-3">
              <input
                type="number"
                min={0}
                className="input-field flex-1"
                value={totalQuota}
                onChange={e => setTotalQuota(Number(e.target.value))}
              />
              <button
                className="btn-primary flex items-center gap-2 min-w-[100px] justify-center"
                onClick={() => saveSetting('totalQuota', totalQuota, setSavingQuota, '总额度已保存')}
                disabled={savingQuota}
              >
                {savingQuota ? '保存中' : (<><Save className="w-4 h-4" /> 保存</>)}
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-1.5">园区每日可预约的月台总配额数</p>
          </div>
        </div>
      </div>

      <PlatformModal
        open={platformModalOpen}
        onClose={() => setPlatformModalOpen(false)}
        platform={editingPlatform}
      />
    </div>
  );
}
