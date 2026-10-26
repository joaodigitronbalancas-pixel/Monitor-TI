export interface MetricPoint {
  timestamp: string;
  cpu_usage_pct: number;
  ram_usage_pct: number;
  disk_usage_pct: number;
}

export interface Computer {
  id: string;
  hostname: string;
  logged_user: string;
  ip_address: string;
  mac_address?: string;
  sector: string;
  os_name: string;
  os_build?: string;
  cpu_model?: string;
  cpu_cores?: number;
  cpu_usage_pct: number;
  ram_total_gb: number;
  ram_used_gb: number;
  ram_usage_pct: number;
  disk_total_gb: number;
  disk_used_gb: number;
  disk_usage_pct: number;
  uptime_seconds: number;
  agent_version: string;
  agent_status: 'running' | 'degraded' | 'stopped';
  created_at: string;
  last_heartbeat: string;
  status: 'online' | 'offline';
  notes?: string;
  metrics_history?: MetricPoint[];
}

export interface EnrollmentToken {
  token: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  max_uses: number;
  current_uses: number;
  assigned_sector: string;
  description: string;
  active: boolean;
}

export interface Alert {
  id: string;
  computer_id: string;
  computer_name: string;
  severity: 'critical' | 'warning' | 'info';
  type: 'offline' | 'high_cpu' | 'high_ram' | 'high_disk' | 'agent_restart';
  message: string;
  created_at: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: string;
  ip_address: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'operator' | 'auditor';
  last_login?: string;
}

export interface SystemSettings {
  heartbeat_timeout_seconds: number;
  alert_cpu_threshold_pct: number;
  alert_ram_threshold_pct: number;
  alert_disk_threshold_pct: number;
  server_listen_ip?: string;
  server_listen_port?: number;
  company_name?: string;
}
