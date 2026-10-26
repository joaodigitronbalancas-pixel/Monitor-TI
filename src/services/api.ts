import { Computer, EnrollmentToken, Alert, AuditLog, SystemSettings, User } from '../types';

const API_BASE = '/api/v1';

function getToken(): string | null {
  return localStorage.getItem('digitron_session_token');
}

export function setToken(token: string) {
  localStorage.setItem('digitron_session_token', token);
}

export function clearToken() {
  localStorage.removeItem('digitron_session_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    window.dispatchEvent(new Event('digitron_auth_expired'));
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.detail || 'Ocorreu um erro na requisição.');
  }

  return data as T;
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const res = await request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setToken(res.token);
    return res;
  },

  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      clearToken();
    }
  },

  async getMe(): Promise<User> {
    return request<User>('/auth/me');
  },

  async changePassword(current_password: string, new_password: string): Promise<{ message: string }> {
    return request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    });
  },

  // Computers
  async getComputers(params: { search?: string; sector?: string; status?: string } = {}): Promise<{
    computers: Computer[];
    stats: { total: number; online: number; offline: number; heartbeat_timeout_seconds: number };
  }> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.sector) query.set('sector', params.sector);
    if (params.status) query.set('status', params.status);

    return request(`/computers?${query.toString()}`);
  },

  async getComputer(id: string): Promise<{ computer: Computer; alerts: Alert[] }> {
    return request(`/computers/${id}`);
  },

  async updateSector(id: string, sector: string): Promise<{ computer: Computer }> {
    return request(`/computers/${id}/sector`, {
      method: 'PATCH',
      body: JSON.stringify({ sector }),
    });
  },

  async updateNotes(id: string, notes: string): Promise<{ computer: Computer }> {
    return request(`/computers/${id}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    });
  },

  async deleteComputer(id: string): Promise<{ message: string }> {
    return request(`/computers/${id}`, {
      method: 'DELETE',
    });
  },

  // Enrollment Tokens
  async getTokens(): Promise<{ tokens: EnrollmentToken[] }> {
    return request('/tokens');
  },

  async createToken(payload: { sector?: string; description?: string; days_valid?: number; max_uses?: number }): Promise<{ token: EnrollmentToken }> {
    return request('/tokens', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async revokeToken(token: string): Promise<{ success: boolean }> {
    return request(`/tokens/${token}`, {
      method: 'DELETE',
    });
  },

  // Alerts
  async getAlerts(acknowledged?: boolean): Promise<{ alerts: Alert[] }> {
    const query = acknowledged !== undefined ? `?acknowledged=${acknowledged}` : '';
    return request(`/alerts${query}`);
  },

  async acknowledgeAlert(id: string): Promise<{ success: boolean; alert: Alert }> {
    return request(`/alerts/${id}/ack`, {
      method: 'POST',
    });
  },

  // Audit Logs
  async getAuditLogs(): Promise<{ audit_logs: AuditLog[] }> {
    return request('/audit');
  },

  // Settings
  async getSettings(): Promise<{ settings: SystemSettings; server_info: any }> {
    return request('/settings');
  },

  async updateSettings(settings: Partial<SystemSettings>): Promise<{ settings: SystemSettings }> {
    return request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  // Test Agent Simulator
  async startSimulator(payload: { hostname: string; sector?: string; logged_user?: string; ip_address?: string; interval_sec?: number }): Promise<any> {
    return request('/simulator/start', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async stopSimulator(hostname: string): Promise<any> {
    return request('/simulator/stop', {
      method: 'POST',
      body: JSON.stringify({ hostname }),
    });
  },

  async listSimulators(): Promise<{ running_simulators: string[] }> {
    return request('/simulator/list');
  },
};
