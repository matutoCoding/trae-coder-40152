import { create } from 'zustand';
import type {
  Platform, Shipper, Reservation, WaitlistItem, Worker,
  QuotaLog, SystemSettings
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
  quotaOverview: { totalQuota: number; totalUsed: number; totalFrozen: number; totalAvailable: number; shippers: Shipper[] } | null;
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
  fetchReservations: (date?: string) => Promise<void>;
  fetchWaitlist: () => Promise<void>;
  fetchWorkers: () => Promise<void>;
  fetchQuota: () => Promise<void>;
  fetchQuotaLogs: () => Promise<void>;
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
  fetchReservations: async (date) => {
    const d = date || get().selectedDate;
    const res = await api.reservations.list({ date: d });
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
  fetchSettings: async () => {
    const res = await api.settings.get();
    if (res.success && res.data) set({ settings: res.data });
  },
}));
