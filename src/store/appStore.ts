import { create } from 'zustand';
import type {
  Platform, Shipper, Reservation, WaitlistItem, Worker,
  QuotaLog, SystemSettings, QuotaOverview, QuotaAdjustment
} from '../../shared/types';
import { api } from '../lib/api';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

interface AppState {
  platforms: Platform[];
  reservations: Reservation[];
  waitlist: WaitlistItem[];
  workers: Worker[];
  quotaLogs: QuotaLog[];
  quotaOverview: QuotaOverview | null;
  quotaAdjustments: QuotaAdjustment[];
  settings: SystemSettings | null;
  notifications: Notification[];
  loading: Record<string, boolean>;
  selectedDate: string;

  setSelectedDate: (d: string) => void;
  pushNotification: (n: Omit<Notification, 'id'>) => void;
  dismissNotification: (id: string) => void;
  setLoading: (key: string, v: boolean) => void;

  fetchAll: () => Promise<void>;
  fetchPlatforms: () => Promise<void>;
  fetchReservations: (dateOrRange?: string | { startDate: string; endDate: string }) => Promise<void>;
  fetchWaitlist: () => Promise<void>;
  fetchWorkers: () => Promise<void>;
  fetchQuota: () => Promise<void>;
  fetchQuotaLogs: () => Promise<void>;
  fetchQuotaAdjustments: (params?: { status?: string; shipperId?: string }) => Promise<void>;
  createQuotaAdjustment: (data: { shipperId: string; type: 'increase' | 'decrease'; amount: number; reason: string; applicant: string }) => Promise<boolean>;
  approveQuotaAdjustment: (id: string, approver: string) => Promise<boolean>;
  rejectQuotaAdjustment: (id: string, approver: string, rejectReason: string) => Promise<boolean>;
  fetchSettings: () => Promise<void>;
}

const today = new Date().toISOString().split('T')[0];

export const useAppStore = create<AppState>((set, get) => ({
  platforms: [],
  reservations: [],
  waitlist: [],
  workers: [],
  quotaLogs: [],
  quotaOverview: null,
  quotaAdjustments: [],
  settings: null,
  notifications: [],
  loading: {},
  selectedDate: today,

  setSelectedDate: (d) => set({ selectedDate: d }),
  pushNotification: (n) => {
    const id = Math.random().toString(36).slice(2);
    set({ notifications: [...get().notifications, { ...n, id }] });
    setTimeout(() => {
      set({ notifications: get().notifications.filter(x => x.id !== id) });
    }, 5000);
  },
  dismissNotification: (id) => set({ notifications: get().notifications.filter(x => x.id !== id) }),
  setLoading: (key, v) => set({ loading: { ...get().loading, [key]: v } }),

  fetchAll: async () => {
    await Promise.all([
      get().fetchPlatforms(),
      get().fetchReservations(),
      get().fetchWaitlist(),
      get().fetchWorkers(),
      get().fetchQuota(),
      get().fetchQuotaLogs(),
      get().fetchSettings(),
    ]);
  },
  fetchPlatforms: async () => {
    const res = await api.platforms.list();
    if (res.success && res.data) set({ platforms: res.data });
  },
  fetchReservations: async (dateOrRange) => {
    let params: { date?: string; startDate?: string; endDate?: string };
    if (dateOrRange && typeof dateOrRange === 'object' && 'startDate' in dateOrRange) {
      params = { startDate: dateOrRange.startDate, endDate: dateOrRange.endDate };
    } else {
      const d = (dateOrRange as string | undefined) || get().selectedDate;
      params = { date: d };
    }
    const res = await api.reservations.list(params);
    if (res.success && res.data) set({ reservations: res.data });
  },
  fetchWaitlist: async () => {
    const res = await api.waitlist.list();
    if (res.success && res.data) set({ waitlist: res.data });
  },
  fetchWorkers: async () => {
    const res = await api.workers.list();
    if (res.success && res.data) set({ workers: res.data });
  },
  fetchQuota: async () => {
    const res = await api.quota.overview();
    if (res.success && res.data) set({ quotaOverview: res.data });
  },
  fetchQuotaLogs: async () => {
    const res = await api.quota.logs(50);
    if (res.success && res.data) set({ quotaLogs: res.data });
  },
  fetchQuotaAdjustments: async (params) => {
    const res = await api.quotaAdjustments.list(params);
    if (res.success && res.data) set({ quotaAdjustments: res.data });
  },
  createQuotaAdjustment: async (data) => {
    const res = await api.quotaAdjustments.create(data);
    if (res.success) {
      get().fetchQuotaAdjustments();
      return true;
    }
    return false;
  },
  approveQuotaAdjustment: async (id, approver) => {
    const res = await api.quotaAdjustments.approve(id, approver);
    if (res.success) {
      get().fetchQuotaAdjustments();
      get().fetchQuota();
      get().fetchQuotaLogs();
      return true;
    }
    return false;
  },
  rejectQuotaAdjustment: async (id, approver, rejectReason) => {
    const res = await api.quotaAdjustments.reject(id, approver, rejectReason);
    if (res.success) {
      get().fetchQuotaAdjustments();
      return true;
    }
    return false;
  },
  fetchSettings: async () => {
    const res = await api.settings.get();
    if (res.success && res.data) set({ settings: res.data });
  },
}));
