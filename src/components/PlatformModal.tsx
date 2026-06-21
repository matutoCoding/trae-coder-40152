import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Platform } from '../../shared/types';
import { useAppStore } from '../store/appStore';
import { api } from '../lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  platform: Platform | null;
}

export default function PlatformModal({ open, onClose, platform }: Props) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'unload' as Platform['type'],
    weightLimit: 25,
    status: 'active' as Platform['status'],
  });
  const [submitting, setSubmitting] = useState(false);

  const pushNotification = useAppStore(s => s.pushNotification);
  const fetchPlatforms = useAppStore(s => s.fetchPlatforms);

  useEffect(() => {
    if (platform) {
      setFormData({
        code: platform.code,
        name: platform.name,
        type: platform.type,
        weightLimit: platform.weightLimit,
        status: platform.status,
      });
    } else {
      setFormData({
        code: '',
        name: '',
        type: 'unload',
        weightLimit: 25,
        status: 'active',
      });
    }
  }, [platform, open]);

  if (!open) return null;

  const handleChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      pushNotification({ type: 'warning', title: '请填写完整信息', message: '编号和名称为必填项' });
      return;
    }
    setSubmitting(true);
    try {
      const res = platform
        ? await api.platforms.update(platform.id, formData)
        : await api.platforms.create(formData);
      if (res.success) {
        pushNotification({
          type: 'success',
          title: platform ? '月台更新成功' : '月台创建成功',
          message: `${formData.code} ${formData.name}`,
        });
        await fetchPlatforms();
        onClose();
      } else {
        pushNotification({ type: 'error', title: '操作失败', message: res.message });
      }
    } catch (e) {
      pushNotification({ type: 'error', title: '操作失败', message: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-[480px] animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h3 className="font-display font-semibold text-lg text-neutral-800">
            {platform ? '编辑月台' : '新增月台'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="label-field">月台编号</label>
            <input
              type="text"
              className="input-field"
              placeholder="如 D01、L01"
              value={formData.code}
              onChange={e => handleChange('code', e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">月台名称</label>
            <input
              type="text"
              className="input-field"
              placeholder="如 D01卸车、L01装车"
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">类型</label>
            <select
              className="input-field"
              value={formData.type}
              onChange={e => handleChange('type', e.target.value as Platform['type'])}
            >
              <option value="unload">卸车</option>
              <option value="load">装车</option>
              <option value="mixed">混合</option>
            </select>
          </div>
          <div>
            <label className="label-field">承重限制（吨）</label>
            <input
              type="number"
              min={0}
              className="input-field"
              value={formData.weightLimit}
              onChange={e => handleChange('weightLimit', Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label-field">状态</label>
            <select
              className="input-field"
              value={formData.status}
              onChange={e => handleChange('status', e.target.value as Platform['status'])}
            >
              <option value="active">启用</option>
              <option value="maintenance">维护</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50 rounded-b-xl">
          <button className="btn-outline" onClick={onClose} disabled={submitting}>
            取消
          </button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '提交中...' : platform ? '保存修改' : '确认创建'}
          </button>
        </div>
      </div>
    </div>
  );
}
