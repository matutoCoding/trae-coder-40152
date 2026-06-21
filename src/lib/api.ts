import type {
  Platform, Shipper, Reservation, WaitlistItem, Worker,
  QuotaLog, SystemSettings, CreateReservationReq, QuotaOverview,
  QuotaAdjustment, OperationLog
} from '../../shared/types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
}

async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
    return await res.json();
  } catch (e) {
    return { success: false, message: (e as Error).message };
  }
}

export const api = {
  platforms: {
    list: () => request<Platform[]>('/api/platforms'),
    create: (p: Partial<Platform>) => request<Platform>('/api/platforms', { method: 'POST', body: JSON.stringify(p) }),
    update: (id: string, p: Partial<Platform>) => request<Platform>(`/api/platforms/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
    remove: (id: string) => request<void>(`/api/platforms/${id}`, { method: 'DELETE' }),
  },
  reservations: {
    list: (params?: { date?: string; startDate?: string; endDate?: string; platformId?: string; status?: string }) => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return request<Reservation[]>(`/api/reservations${qs}`);
    },
    create: (data: CreateReservationReq) => request<Reservation>('/api/reservations', { method: 'POST', body: JSON.stringify(data) }),
    confirm: (id: string) => request<Reservation>(`/api/reservations/${id}/confirm`, { method: 'PUT' }),
    complete: (id: string) => request<Reservation>(`/api/reservations/${id}/complete`, { method: 'PUT' }),
    cancel: (id: string) => request<Reservation>(`/api/reservations/${id}/cancel`, { method: 'PUT' }),
    assign: (id: string, workerIds: string[]) => request<Reservation>(`/api/reservations/${id}/assign`, { method: 'PUT', body: JSON.stringify({ workerIds }) }),
  },
  waitlist: {
    list: () => request<WaitlistItem[]>('/api/waitlist'),
    create: (data: Partial<WaitlistItem>) => request<WaitlistItem>('/api/waitlist', { method: 'POST', body: JSON.stringify(data) }),
    confirm: (id: string) => request<{ success: boolean; reservation?: Reservation }>(`/api/waitlist/${id}/confirm`, { method: 'PUT' }),
    skip: (id: string, skipReason: string = '用户主动跳过') => request<WaitlistItem>(`/api/waitlist/${id}/skip`, { method: 'PUT', body: JSON.stringify({ skipReason }) }),
    remove: (id: string) => request<void>(`/api/waitlist/${id}`, { method: 'DELETE' }),
  },
  quota: {
    overview: () => request<QuotaOverview>('/api/quota'),
    updateShipper: (id: string, quota: number) => request<Shipper>(`/api/quota/shippers/${id}`, { method: 'PUT', body: JSON.stringify({ quota }) }),
    logs: (limit?: number) => {
      const qs = limit ? `?limit=${limit}` : '';
      return request<QuotaLog[]>(`/api/quota/logs${qs}`);
    },
  },
  quotaAdjustments: {
    list: (params?: { status?: string; shipperId?: string }) => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return request<QuotaAdjustment[]>(`/api/quota-adjustments${qs}`);
    },
    create: (data: { shipperId: string; type: 'increase' | 'decrease'; amount: number; reason: string; applicant: string }) =>
      request<QuotaAdjustment>('/api/quota-adjustments', { method: 'POST', body: JSON.stringify(data) }),
    approve: (id: string, approver: string) =>
      request<QuotaAdjustment>(`/api/quota-adjustments/${id}/approve`, { method: 'PUT', body: JSON.stringify({ approver }) }),
    reject: (id: string, approver: string, rejectReason: string) =>
      request<QuotaAdjustment>(`/api/quota-adjustments/${id}/reject`, { method: 'PUT', body: JSON.stringify({ approver, rejectReason }) }),
  },
  workers: {
    list: () => request<Worker[]>('/api/workers'),
    create: (data: Partial<Worker>) => request<Worker>('/api/workers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Worker>) => request<Worker>(`/api/workers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
  settings: {
    get: () => request<SystemSettings>('/api/settings'),
    update: (data: Partial<SystemSettings>) => request<SystemSettings>('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),
  },
  operationLogs: {
    getByReservation: (reservationId: string) => request<OperationLog[]>(`/api/operation-logs/${reservationId}`),
  },
};
