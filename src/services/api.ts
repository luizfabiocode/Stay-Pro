import {
  User,
  Propriedade,
  Reserva,
  DashboardStats,
  MonthlyReportData,
  AuditLog,
  PlanType,
  SecurityAlert,
  BackupItem,
} from '../types';

const TOKEN_KEY = 'staypro_auth_token';
const REFRESH_TOKEN_KEY = 'staypro_refresh_token';

export const getStoredToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setStoredToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const removeStoredToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const getStoredRefreshToken = (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY);
export const setStoredRefreshToken = (token: string): void => localStorage.setItem(REFRESH_TOKEN_KEY, token);

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

export async function apiRequest<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const token = getStoredToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-StayPro-Client': 'StayPro-React-Web',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  let url = endpoint;
  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && (data.sessionExpired || data.error?.includes('expirada'))) {
      removeStoredToken();
      window.dispatchEvent(new CustomEvent('staypro:session-expired'));
    }
    throw new Error(data.error || `Erro na requisição (${response.status})`);
  }

  return data as T;
}

// ----------------------------------------------------
// AUTH API
// ----------------------------------------------------
export const authApi = {
  getCaptcha: () => apiRequest<{ captchaId: string; challengeText: string }>('/api/auth/captcha'),
  register: (payload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    cpf?: string;
    propertyName: string;
    lgpdAccepted: boolean;
  }) =>
    apiRequest<{
      message: string;
      token: string;
      refreshToken: string;
      verificationToken: string;
      user: User;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: (payload: {
    email: string;
    password: string;
    captchaId?: string;
    captchaAnswer?: string;
    twoFactorCode?: string;
  }) =>
    apiRequest<{
      message: string;
      token: string;
      refreshToken: string;
      user: User;
      require2FA?: boolean;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  refreshToken: (refreshToken: string) =>
    apiRequest<{ token: string; refreshToken: string }>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
  extendSession: () =>
    apiRequest<{ message: string; remainingMinutes: number }>('/api/auth/extend-session', {
      method: 'POST',
    }),
  verifyEmail: (token: string) =>
    apiRequest<{ message: string }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  requestPasswordReset: (email: string) =>
    apiRequest<{ message: string; resetToken?: string }>('/api/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (payload: { token: string; newPassword: string }) =>
    apiRequest<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  me: () =>
    apiRequest<{
      user: User;
      propriedade: Propriedade;
      propriedades?: Propriedade[];
    }>('/api/auth/me'),
  switchProperty: (propriedadeId: string) =>
    apiRequest<{
      message: string;
      user: User;
      propriedade: Propriedade;
      propriedades: Propriedade[];
    }>('/api/auth/switch-property', {
      method: 'POST',
      body: JSON.stringify({ propriedadeId }),
    }),
  logout: () =>
    apiRequest<{ message: string }>('/api/auth/logout', {
      method: 'POST',
    }),

  // 2FA Endpoints
  generate2fa: () =>
    apiRequest<{
      secret: string;
      qrCodeUri: string;
      backupCodes: string[];
    }>('/api/auth/2fa/generate', { method: 'POST' }),
  verify2fa: (code: string) =>
    apiRequest<{ message: string; user: User }>('/api/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  disable2fa: (code: string) =>
    apiRequest<{ message: string; user: User }>('/api/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
};

// ----------------------------------------------------
// PROPERTY API (Multi-Imóvel)
// ----------------------------------------------------
export const propertyApi = {
  get: () => apiRequest<Propriedade>('/api/propriedade'),
  list: () => apiRequest<Propriedade[]>('/api/propriedades'),
  create: (payload: Partial<Propriedade>) =>
    apiRequest<{
      message: string;
      propriedade: Propriedade;
      propriedades: Propriedade[];
      user: User;
    }>('/api/propriedades', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (payload: Partial<Propriedade>) =>
    apiRequest<{ message: string; propriedade: Propriedade }>('/api/propriedade', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};

// ----------------------------------------------------
// RESERVATIONS API
// ----------------------------------------------------
export const reservationsApi = {
  list: (params?: { q?: string; status?: string; mes?: string; page?: number; limit?: number }) =>
    apiRequest<{
      reservas: Reserva[];
      total: number;
      page: number;
      totalPages: number;
      limit: number;
    }>('/api/reservas', { params }),
  create: (payload: Partial<Reserva>) =>
    apiRequest<{ message: string; reserva: Reserva }>('/api/reservas', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createBlock: (payload: { checkIn: string; checkOut: string; motivoBloqueio?: string }) =>
    apiRequest<{ message: string; reserva: Reserva }>('/api/reservas/bloqueio', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Partial<Reserva>) =>
    apiRequest<{ message: string; reserva: Reserva }>(`/api/reservas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  delete: (id: string) =>
    apiRequest<{ message: string }>(`/api/reservas/${id}`, {
      method: 'DELETE',
    }),
};

// ----------------------------------------------------
// DASHBOARD & REPORTS API
// ----------------------------------------------------
export const dashboardApi = {
  getStats: () => apiRequest<DashboardStats>('/api/dashboard/stats'),
};

export const reportsApi = {
  getMonthly: (mes?: string) =>
    apiRequest<MonthlyReportData>('/api/relatorios/mensal', {
      params: { mes },
    }),
};

// ----------------------------------------------------
// USERS & COLLABORATORS API
// ----------------------------------------------------
export const usersApi = {
  list: () =>
    apiRequest<{
      usuarios: User[];
      planoAtual: PlanType;
    }>('/api/usuarios'),
  invite: (payload: { name: string; email: string; role: 'admin' | 'colaborador' }) =>
    apiRequest<{
      message: string;
      inviteLink: string;
      temporaryPassword: string;
      usuario: User;
    }>('/api/usuarios/convidar', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    apiRequest<{ message: string }>(`/api/usuarios/${id}`, {
      method: 'DELETE',
    }),
  updatePlan: (plan: PlanType) =>
    apiRequest<{ message: string; plan: PlanType }>('/api/usuarios/plano', {
      method: 'PUT',
      body: JSON.stringify({ plan }),
    }),
};

// ----------------------------------------------------
// AUDIT LOGS & SECURITY ALERTS API
// ----------------------------------------------------
export const logsApi = {
  list: (params?: { action?: string; risk?: string }) =>
    apiRequest<AuditLog[]>('/api/logs', {
      params,
    }),
  getAlerts: () => apiRequest<SecurityAlert[]>('/api/admin/security-alerts'),
  resolveAlert: (id: string) =>
    apiRequest<{ message: string }>(`/api/admin/security-alerts/${id}/resolve`, {
      method: 'POST',
    }),
};

// ----------------------------------------------------
// BACKUPS & DISASTER RECOVERY API
// ----------------------------------------------------
export const backupApi = {
  list: () => apiRequest<BackupItem[]>('/api/admin/backups'),
  create: () =>
    apiRequest<{ message: string; backup: BackupItem }>('/api/admin/backups', {
      method: 'POST',
    }),
  restore: (id: string) =>
    apiRequest<{ message: string }>('/api/admin/backups/restore', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),
};

// ----------------------------------------------------
// LGPD & PRIVACY API
// ----------------------------------------------------
export const lgpdApi = {
  exportData: () => apiRequest<{ timestamp: string; user: any; properties: any[]; reservations: any[]; logs: any[] }>('/api/lgpd/export'),
  requestDeletion: (reason?: string) =>
    apiRequest<{ message: string }>('/api/lgpd/delete-account', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  getConsentStatus: () => apiRequest<{ accepted: boolean; version: string; date: string }>('/api/lgpd/consent'),
  updateConsent: (accepted: boolean) =>
    apiRequest<{ message: string }>('/api/lgpd/consent', {
      method: 'POST',
      body: JSON.stringify({ accepted }),
    }),
};

// ----------------------------------------------------
// WEBHOOKS API (SIEM / SLACK / TEAMS)
// ----------------------------------------------------
export const webhookApi = {
  getConfig: () => apiRequest<{ webhookUrl: string; enabled: boolean; highRiskOnly: boolean }>('/api/admin/webhooks'),
  saveConfig: (payload: { webhookUrl: string; enabled: boolean; highRiskOnly: boolean }) =>
    apiRequest<{ message: string }>('/api/admin/webhooks', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  testWebhook: (webhookUrl: string) =>
    apiRequest<{ message: string; success: boolean }>('/api/admin/webhooks/test', {
      method: 'POST',
      body: JSON.stringify({ webhookUrl }),
    }),
};

// ----------------------------------------------------
// UNIFIED SECURITY API HELPER
// ----------------------------------------------------
export const securityApi = {
  generate2FA: () => authApi.generate2fa(),
  verify2FA: (code: string) => authApi.verify2fa(code),
  disable2FA: (code: string) => authApi.disable2fa(code),
  getSecurityAlerts: () => logsApi.getAlerts(),
  resolveSecurityAlert: (id: string) => logsApi.resolveAlert(id),
  getBackups: () => backupApi.list(),
  createBackup: () => backupApi.create(),
  restoreBackup: (id: string) => backupApi.restore(id),
  getWebhookConfig: () => webhookApi.getConfig(),
  saveWebhookConfig: (payload: { webhookUrl: string; enabled: boolean; highRiskOnly: boolean }) => webhookApi.saveConfig(payload),
  testWebhook: (webhookUrl: string) => webhookApi.testWebhook(webhookUrl),
  exportLGPDData: () => lgpdApi.exportData(),
  deleteAccountLGPD: (reason?: string) => lgpdApi.requestDeletion(reason),
};
