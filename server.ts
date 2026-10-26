import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json({ limit: '5mb' }));

// ---------------------------------------------------------------------------
// Storage & Persistence
// ---------------------------------------------------------------------------
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface MetricPoint {
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
  machine_secret_hash: string;
  created_at: string;
  last_heartbeat: string;
  status: 'online' | 'offline';
  notes?: string;
  metrics_history: MetricPoint[];
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

export interface SystemSettings {
  heartbeat_timeout_seconds: number;
  alert_cpu_threshold_pct: number;
  alert_ram_threshold_pct: number;
  alert_disk_threshold_pct: number;
  server_listen_ip: string;
  server_listen_port: number;
  company_name: string;
  cors_allowed_origins: string[];
}

interface DatabaseSchema {
  users: Array<{
    id: string;
    username: string;
    email: string;
    password_hash: string;
    salt: string;
    role: 'admin' | 'operator' | 'auditor';
    created_at: string;
    last_login?: string;
    failed_attempts: number;
    locked_until?: string;
  }>;
  computers: Computer[];
  enrollment_tokens: EnrollmentToken[];
  alerts: Alert[];
  audit_logs: AuditLog[];
  settings: SystemSettings;
}

// Password helpers (PBKDF2)
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

function loadDatabase(): DatabaseSchema {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      console.error('[DB] Error reading database file, recreating default:', err);
    }
  }

  // Initial seed with Default Admin
  const adminSalt = generateSalt();
  const defaultAdmin = {
    id: crypto.randomUUID(),
    username: 'admin',
    email: 'admin@digitron.local',
    password_hash: hashPassword('Admin@Digitron2026!', adminSalt),
    salt: adminSalt,
    role: 'admin' as const,
    created_at: new Date().toISOString(),
    failed_attempts: 0,
  };

  const initialDb: DatabaseSchema = {
    users: [defaultAdmin],
    computers: [],
    enrollment_tokens: [
      {
        token: 'DIGITRON-INIT-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
        created_by: 'system',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        max_uses: 100,
        current_uses: 0,
        assigned_sector: 'TI & Infraestrutura',
        description: 'Token padrão de implantação da rede DIGI-TRON',
        active: true,
      },
    ],
    alerts: [],
    audit_logs: [
      {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        user: 'system',
        action: 'INITIALIZE',
        resource_type: 'SYSTEM',
        details: 'Banco de dados do DIGI-TRON Monitor inicializado com sucesso.',
        ip_address: '127.0.0.1',
      },
    ],
    settings: {
      heartbeat_timeout_seconds: 90, // When agent hasn't called in 90s, mark offline
      alert_cpu_threshold_pct: 90,
      alert_ram_threshold_pct: 90,
      alert_disk_threshold_pct: 90,
      server_listen_ip: '0.0.0.0',
      server_listen_port: 3000,
      company_name: 'DIGI-TRON Balanças Industriais',
      cors_allowed_origins: ['*'],
    },
  };

  saveDatabase(initialDb);
  return initialDb;
}

let db = loadDatabase();

function saveDatabase(dataToSave: DatabaseSchema = db): void {
  const tmpPath = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(dataToSave, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_FILE);
}

// Compute dynamic online/offline status for all computers based on timeout
function refreshComputerStatuses(): void {
  const now = Date.now();
  const timeoutMs = db.settings.heartbeat_timeout_seconds * 1000;
  let changed = false;

  for (const comp of db.computers) {
    const lastHb = new Date(comp.last_heartbeat).getTime();
    const isOnline = now - lastHb <= timeoutMs;
    const newStatus = isOnline ? 'online' : 'offline';

    if (comp.status !== newStatus) {
      comp.status = newStatus;
      changed = true;

      if (newStatus === 'offline') {
        const alert: Alert = {
          id: crypto.randomUUID(),
          computer_id: comp.id,
          computer_name: comp.hostname,
          severity: 'critical',
          type: 'offline',
          message: `Computador "${comp.hostname}" parou de enviar heartbeats há mais de ${db.settings.heartbeat_timeout_seconds}s.`,
          created_at: new Date().toISOString(),
          acknowledged: false,
        };
        db.alerts.unshift(alert);
        // keep alerts within last 500
        if (db.alerts.length > 500) db.alerts.pop();

        db.audit_logs.unshift({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          user: 'MONITOR_DAEMON',
          action: 'STATUS_CHANGE',
          resource_type: 'COMPUTER',
          resource_id: comp.id,
          details: `Máquina ${comp.hostname} (${comp.ip_address}) marcada como OFFLINE por inatividade.`,
          ip_address: '127.0.0.1',
        });
      }
    }
  }

  if (changed) {
    saveDatabase();
  }
}

// Run status checker every 10 seconds
setInterval(refreshComputerStatuses, 10000);

// In-memory sessions
const activeSessions = new Map<string, { userId: string; username: string; role: string; expiresAt: number }>();

function authenticateUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autorizado. Token de sessão não fornecido.' });
  }

  const token = authHeader.split(' ')[1];
  const session = activeSessions.get(token);

  if (!session || session.expiresAt < Date.now()) {
    if (session) activeSessions.delete(token);
    return res.status(401).json({ error: 'Sessão expirada ou inválida. Faça login novamente.' });
  }

  // Extend session by 2 hours on activity
  session.expiresAt = Date.now() + 2 * 60 * 60 * 1000;
  (req as any).user = session;
  next();
}

function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Acesso negado: permissão insuficiente.' });
    }
    next();
  };
}

// ---------------------------------------------------------------------------
// API Routes: Authentication
// ---------------------------------------------------------------------------
app.post('/api/v1/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
  }

  const user = db.users.find((u) => u.username.toLowerCase() === String(username).toLowerCase().trim());
  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  // Brute force protection: check lockout
  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    const remainingMins = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
    return res.status(429).json({
      error: `Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em ${remainingMins} minuto(s).`,
    });
  }

  const candidateHash = hashPassword(password, user.salt);
  if (candidateHash !== user.password_hash) {
    user.failed_attempts = (user.failed_attempts || 0) + 1;
    if (user.failed_attempts >= 5) {
      user.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      db.audit_logs.unshift({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        user: user.username,
        action: 'ACCOUNT_LOCKED',
        resource_type: 'AUTH',
        details: `Bloqueio ativado após 5 tentativas incorretas a partir do IP ${clientIp}.`,
        ip_address: String(clientIp),
      });
    }
    saveDatabase();
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  // Reset failed attempts on success
  user.failed_attempts = 0;
  user.locked_until = undefined;
  user.last_login = new Date().toISOString();

  // Create session token
  const sessionToken = crypto.randomBytes(32).toString('hex');
  activeSessions.set(sessionToken, {
    userId: user.id,
    username: user.username,
    role: user.role,
    expiresAt: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
  });

  db.audit_logs.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    user: user.username,
    action: 'LOGIN_SUCCESS',
    resource_type: 'AUTH',
    details: `Login efetuado com sucesso via painel web.`,
    ip_address: String(clientIp),
  });
  saveDatabase();

  return res.json({
    token: sessionToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  });
});

app.post('/api/v1/auth/logout', authenticateUser, (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) activeSessions.delete(token);
  return res.json({ success: true, message: 'Logout efetuado com sucesso.' });
});

app.get('/api/v1/auth/me', authenticateUser, (req: Request, res: Response) => {
  const session = (req as any).user;
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  return res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    last_login: user.last_login,
  });
});

app.post('/api/v1/auth/change-password', authenticateUser, (req: Request, res: Response) => {
  const session = (req as any).user;
  const { current_password, new_password } = req.body;

  if (!new_password || new_password.length < 8) {
    return res.status(400).json({ error: 'A nova senha deve ter no mínimo 8 caracteres.' });
  }

  const user = db.users.find((u) => u.id === session.userId);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const currentHash = hashPassword(current_password, user.salt);
  if (currentHash !== user.password_hash) {
    return res.status(401).json({ error: 'Senha atual incorreta.' });
  }

  const newSalt = generateSalt();
  user.salt = newSalt;
  user.password_hash = hashPassword(new_password, newSalt);

  db.audit_logs.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    user: user.username,
    action: 'PASSWORD_CHANGED',
    resource_type: 'AUTH',
    details: 'Senha de acesso atualizada pelo próprio usuário.',
    ip_address: String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1'),
  });

  saveDatabase();
  return res.json({ success: true, message: 'Senha alterada com sucesso.' });
});

// ---------------------------------------------------------------------------
// API Routes: Computers & Telemetry
// ---------------------------------------------------------------------------
app.get('/api/v1/computers', authenticateUser, (req: Request, res: Response) => {
  refreshComputerStatuses();

  const { search, sector, status, sort_by = 'last_heartbeat', order = 'desc' } = req.query;

  let result = [...db.computers];

  if (search) {
    const q = String(search).toLowerCase();
    result = result.filter(
      (c) =>
        c.hostname.toLowerCase().includes(q) ||
        c.logged_user.toLowerCase().includes(q) ||
        c.ip_address.toLowerCase().includes(q) ||
        c.sector.toLowerCase().includes(q) ||
        (c.notes && c.notes.toLowerCase().includes(q))
    );
  }

  if (sector && sector !== 'all') {
    result = result.filter((c) => c.sector === sector);
  }

  if (status && status !== 'all') {
    result = result.filter((c) => c.status === status);
  }

  result.sort((a: any, b: any) => {
    let valA = a[sort_by as string] ?? '';
    let valB = b[sort_by as string] ?? '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return order === 'asc' ? -1 : 1;
    if (valA > valB) return order === 'asc' ? 1 : -1;
    return 0;
  });

  const total = db.computers.length;
  const online = db.computers.filter((c) => c.status === 'online').length;
  const offline = total - online;

  return res.json({
    computers: result,
    stats: {
      total,
      online,
      offline,
      heartbeat_timeout_seconds: db.settings.heartbeat_timeout_seconds,
    },
  });
});

app.get('/api/v1/computers/:id', authenticateUser, (req: Request, res: Response) => {
  refreshComputerStatuses();
  const computer = db.computers.find((c) => c.id === req.params.id);
  if (!computer) return res.status(404).json({ error: 'Computador não encontrado.' });

  const computerAlerts = db.alerts.filter((a) => a.computer_id === computer.id);

  return res.json({
    computer,
    alerts: computerAlerts,
  });
});

app.patch('/api/v1/computers/:id/sector', authenticateUser, requireRole(['admin', 'operator']), (req: Request, res: Response) => {
  const { sector } = req.body;
  if (!sector) return res.status(400).json({ error: 'Setor é obrigatório.' });

  const computer = db.computers.find((c) => c.id === req.params.id);
  if (!computer) return res.status(404).json({ error: 'Computador não encontrado.' });

  const prev = computer.sector;
  computer.sector = sector;

  db.audit_logs.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    user: (req as any).user.username,
    action: 'UPDATE_SECTOR',
    resource_type: 'COMPUTER',
    resource_id: computer.id,
    details: `Setor alterado de "${prev}" para "${sector}" na máquina ${computer.hostname}.`,
    ip_address: String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1'),
  });

  saveDatabase();
  return res.json({ success: true, computer });
});

app.patch('/api/v1/computers/:id/notes', authenticateUser, requireRole(['admin', 'operator']), (req: Request, res: Response) => {
  const { notes } = req.body;
  const computer = db.computers.find((c) => c.id === req.params.id);
  if (!computer) return res.status(404).json({ error: 'Computador não encontrado.' });

  computer.notes = String(notes || '');
  saveDatabase();
  return res.json({ success: true, computer });
});

app.delete('/api/v1/computers/:id', authenticateUser, requireRole(['admin']), (req: Request, res: Response) => {
  const index = db.computers.findIndex((c) => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Computador não encontrado.' });

  const removed = db.computers.splice(index, 1)[0];

  db.audit_logs.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    user: (req as any).user.username,
    action: 'DELETE_COMPUTER',
    resource_type: 'COMPUTER',
    resource_id: removed.id,
    details: `Máquina ${removed.hostname} (${removed.ip_address}) removida do cadastro pelo administrador.`,
    ip_address: String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1'),
  });

  saveDatabase();
  return res.json({ success: true, message: `Computador ${removed.hostname} removido com sucesso.` });
});

// ---------------------------------------------------------------------------
// Agent Handshake & Heartbeat Protocol
// ---------------------------------------------------------------------------

// 1. Register new agent using Enrollment Token
app.post('/api/v1/agent/register', (req: Request, res: Response) => {
  const { enrollment_token, hostname, mac_address, os_name, os_build, cpu_model, cpu_cores, ram_total_gb, disk_total_gb } = req.body;
  const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1');

  if (!enrollment_token || !hostname) {
    return res.status(400).json({ error: 'Token de matrícula (enrollment_token) e hostname são obrigatórios.' });
  }

  const tokenRecord = db.enrollment_tokens.find((t) => t.token === enrollment_token && t.active);
  if (!tokenRecord) {
    return res.status(403).json({ error: 'Token de matrícula inválido ou desativado.' });
  }

  if (new Date(tokenRecord.expires_at).getTime() < Date.now()) {
    return res.status(403).json({ error: 'Token de matrícula expirado.' });
  }

  if (tokenRecord.max_uses > 0 && tokenRecord.current_uses >= tokenRecord.max_uses) {
    return res.status(403).json({ error: 'Limite de instalações deste token esgotado.' });
  }

  // Check if computer already registered by MAC or Hostname
  let existingComp = db.computers.find(
    (c) => (mac_address && c.mac_address && c.mac_address === mac_address) || c.hostname.toLowerCase() === hostname.toLowerCase()
  );

  const machine_id = existingComp ? existingComp.id : crypto.randomUUID();
  const machine_secret = crypto.randomBytes(32).toString('hex');
  const secret_hash = crypto.createHash('sha256').update(machine_secret).digest('hex');

  const now = new Date().toISOString();

  if (existingComp) {
    existingComp.machine_secret_hash = secret_hash;
    existingComp.hostname = hostname;
    existingComp.ip_address = clientIp;
    if (mac_address) existingComp.mac_address = mac_address;
    if (os_name) existingComp.os_name = os_name;
    if (os_build) existingComp.os_build = os_build;
    if (cpu_model) existingComp.cpu_model = cpu_model;
    if (cpu_cores) existingComp.cpu_cores = cpu_cores;
    if (ram_total_gb) existingComp.ram_total_gb = ram_total_gb;
    if (disk_total_gb) existingComp.disk_total_gb = disk_total_gb;
    existingComp.status = 'online';
    existingComp.last_heartbeat = now;
  } else {
    const newComp: Computer = {
      id: machine_id,
      hostname,
      logged_user: 'N/A',
      ip_address: clientIp,
      mac_address,
      sector: tokenRecord.assigned_sector || 'Geral',
      os_name: os_name || 'Windows 11 Enterprise',
      os_build,
      cpu_model,
      cpu_cores,
      cpu_usage_pct: 0,
      ram_total_gb: ram_total_gb || 16,
      ram_used_gb: 0,
      ram_usage_pct: 0,
      disk_total_gb: disk_total_gb || 256,
      disk_used_gb: 0,
      disk_usage_pct: 0,
      uptime_seconds: 0,
      agent_version: '1.0.0',
      agent_status: 'running',
      machine_secret_hash: secret_hash,
      created_at: now,
      last_heartbeat: now,
      status: 'online',
      metrics_history: [],
    };
    db.computers.push(newComp);
  }

  tokenRecord.current_uses += 1;

  db.audit_logs.unshift({
    id: crypto.randomUUID(),
    timestamp: now,
    user: 'AGENT_REGISTRATION',
    action: 'REGISTER_SUCCESS',
    resource_type: 'COMPUTER',
    resource_id: machine_id,
    details: `Novo agente registrado com sucesso para o computador ${hostname} (${clientIp}).`,
    ip_address: clientIp,
  });

  saveDatabase();

  return res.status(201).json({
    status: 'success',
    machine_id,
    machine_secret, // Sent ONCE during registration, agent must save locally in protected config.ini
    server_time: now,
    heartbeat_interval_sec: 60,
  });
});

// 2. Authenticated Heartbeat from Windows Agent
app.post('/api/v1/agent/heartbeat', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const machineIdHeader = (req.headers['x-machine-id'] as string) || req.body.machine_id;

  if (!authHeader || !authHeader.startsWith('Bearer ') || !machineIdHeader) {
    return res.status(401).json({ error: 'Autenticação necessária: envie Bearer <machine_secret> e X-Machine-ID.' });
  }

  const rawSecret = authHeader.split(' ')[1];
  const candidateHash = crypto.createHash('sha256').update(rawSecret).digest('hex');

  const comp = db.computers.find((c) => c.id === machineIdHeader);
  if (!comp) {
    return res.status(404).json({ error: 'Computador não cadastrado. Reinstale ou registre novamente.' });
  }

  if (comp.machine_secret_hash !== candidateHash) {
    return res.status(403).json({ error: 'Segredo de autenticação da máquina inválido.' });
  }

  const {
    hostname,
    logged_user,
    ip_address,
    mac_address,
    os_name,
    os_build,
    cpu_model,
    cpu_cores,
    cpu_usage_pct,
    ram_total_gb,
    ram_used_gb,
    ram_usage_pct,
    disk_total_gb,
    disk_used_gb,
    disk_usage_pct,
    uptime_seconds,
    agent_version,
    agent_status,
  } = req.body;

  const clientIp = String(ip_address || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1');
  const now = new Date().toISOString();

  const wasOffline = comp.status === 'offline';

  // Update telemetry fields
  if (hostname) comp.hostname = hostname;
  if (logged_user !== undefined) comp.logged_user = logged_user;
  comp.ip_address = clientIp;
  if (mac_address) comp.mac_address = mac_address;
  if (os_name) comp.os_name = os_name;
  if (os_build) comp.os_build = os_build;
  if (cpu_model) comp.cpu_model = cpu_model;
  if (cpu_cores !== undefined) comp.cpu_cores = Number(cpu_cores);

  comp.cpu_usage_pct = Number(cpu_usage_pct ?? comp.cpu_usage_pct);
  if (ram_total_gb !== undefined) comp.ram_total_gb = Number(ram_total_gb);
  if (ram_used_gb !== undefined) comp.ram_used_gb = Number(ram_used_gb);
  comp.ram_usage_pct = Number(ram_usage_pct ?? comp.ram_usage_pct);

  if (disk_total_gb !== undefined) comp.disk_total_gb = Number(disk_total_gb);
  if (disk_used_gb !== undefined) comp.disk_used_gb = Number(disk_used_gb);
  comp.disk_usage_pct = Number(disk_usage_pct ?? comp.disk_usage_pct);

  if (uptime_seconds !== undefined) comp.uptime_seconds = Number(uptime_seconds);
  if (agent_version) comp.agent_version = agent_version;
  comp.agent_status = agent_status || 'running';
  comp.last_heartbeat = now;
  comp.status = 'online';

  // Append to rolling metric points (keep last 60 points ~ 1 hour)
  if (!comp.metrics_history) comp.metrics_history = [];
  comp.metrics_history.push({
    timestamp: now,
    cpu_usage_pct: comp.cpu_usage_pct,
    ram_usage_pct: comp.ram_usage_pct,
    disk_usage_pct: comp.disk_usage_pct,
  });
  if (comp.metrics_history.length > 60) {
    comp.metrics_history.shift();
  }

  // Check alerts
  if (comp.cpu_usage_pct >= db.settings.alert_cpu_threshold_pct) {
    // Avoid spamming if alert exists in last 5 minutes
    const recent = db.alerts.find(
      (a) => a.computer_id === comp.id && a.type === 'high_cpu' && Date.now() - new Date(a.created_at).getTime() < 300000
    );
    if (!recent) {
      db.alerts.unshift({
        id: crypto.randomUUID(),
        computer_id: comp.id,
        computer_name: comp.hostname,
        severity: 'warning',
        type: 'high_cpu',
        message: `Uso crítico de CPU: ${comp.cpu_usage_pct.toFixed(1)}% (limite ${db.settings.alert_cpu_threshold_pct}%).`,
        created_at: now,
        acknowledged: false,
      });
    }
  }

  if (comp.ram_usage_pct >= db.settings.alert_ram_threshold_pct) {
    const recent = db.alerts.find(
      (a) => a.computer_id === comp.id && a.type === 'high_ram' && Date.now() - new Date(a.created_at).getTime() < 300000
    );
    if (!recent) {
      db.alerts.unshift({
        id: crypto.randomUUID(),
        computer_id: comp.id,
        computer_name: comp.hostname,
        severity: 'warning',
        type: 'high_ram',
        message: `Uso crítico de Memória RAM: ${comp.ram_usage_pct.toFixed(1)}% (limite ${db.settings.alert_ram_threshold_pct}%).`,
        created_at: now,
        acknowledged: false,
      });
    }
  }

  if (comp.disk_usage_pct >= db.settings.alert_disk_threshold_pct) {
    const recent = db.alerts.find(
      (a) => a.computer_id === comp.id && a.type === 'high_disk' && Date.now() - new Date(a.created_at).getTime() < 300000
    );
    if (!recent) {
      db.alerts.unshift({
        id: crypto.randomUUID(),
        computer_id: comp.id,
        computer_name: comp.hostname,
        severity: 'critical',
        type: 'high_disk',
        message: `Espaço em disco crítico: ${comp.disk_usage_pct.toFixed(1)}% ocupado.`,
        created_at: now,
        acknowledged: false,
      });
    }
  }

  // If was offline and recovered
  if (wasOffline) {
    db.audit_logs.unshift({
      id: crypto.randomUUID(),
      timestamp: now,
      user: 'MONITOR_DAEMON',
      action: 'STATUS_RECOVERY',
      resource_type: 'COMPUTER',
      resource_id: comp.id,
      details: `Máquina ${comp.hostname} restabeleceu comunicação e está ONLINE novamente.`,
      ip_address: clientIp,
    });
  }

  saveDatabase();

  return res.json({
    status: 'ok',
    server_time: now,
    next_heartbeat_sec: 60,
  });
});

// ---------------------------------------------------------------------------
// Enrollment Tokens Management
// ---------------------------------------------------------------------------
app.get('/api/v1/tokens', authenticateUser, requireRole(['admin', 'operator']), (req: Request, res: Response) => {
  return res.json({ tokens: db.enrollment_tokens });
});

app.post('/api/v1/tokens', authenticateUser, requireRole(['admin']), (req: Request, res: Response) => {
  const { sector, description, days_valid = 30, max_uses = 50 } = req.body;

  const tokenString = 'DIGITRON-' + crypto.randomBytes(6).toString('hex').toUpperCase();
  const expiresAt = new Date(Date.now() + Number(days_valid) * 24 * 3600 * 1000).toISOString();

  const newToken: EnrollmentToken = {
    token: tokenString,
    created_by: (req as any).user.username,
    created_at: new Date().toISOString(),
    expires_at: expiresAt,
    max_uses: Number(max_uses),
    current_uses: 0,
    assigned_sector: sector || 'Geral',
    description: description || 'Token gerado para instalação de novos computadores',
    active: true,
  };

  db.enrollment_tokens.unshift(newToken);

  db.audit_logs.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    user: (req as any).user.username,
    action: 'CREATE_TOKEN',
    resource_type: 'ENROLLMENT_TOKEN',
    details: `Token ${tokenString} gerado com validade até ${expiresAt} para o setor ${newToken.assigned_sector}.`,
    ip_address: String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1'),
  });

  saveDatabase();
  return res.status(201).json({ token: newToken });
});

app.delete('/api/v1/tokens/:token', authenticateUser, requireRole(['admin']), (req: Request, res: Response) => {
  const target = db.enrollment_tokens.find((t) => t.token === req.params.token);
  if (!target) return res.status(404).json({ error: 'Token não encontrado.' });

  target.active = false;

  db.audit_logs.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    user: (req as any).user.username,
    action: 'REVOKE_TOKEN',
    resource_type: 'ENROLLMENT_TOKEN',
    details: `Token ${target.token} revogado pelo administrador.`,
    ip_address: String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1'),
  });

  saveDatabase();
  return res.json({ success: true, message: 'Token revogado com sucesso.' });
});

// ---------------------------------------------------------------------------
// Alerts & Notifications
// ---------------------------------------------------------------------------
app.get('/api/v1/alerts', authenticateUser, (req: Request, res: Response) => {
  const { acknowledged } = req.query;
  let list = db.alerts;
  if (acknowledged === 'false') {
    list = list.filter((a) => !a.acknowledged);
  }
  return res.json({ alerts: list.slice(0, 100) });
});

app.post('/api/v1/alerts/:id/ack', authenticateUser, (req: Request, res: Response) => {
  const alert = db.alerts.find((a) => a.id === req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alerta não encontrado.' });

  alert.acknowledged = true;
  alert.acknowledged_by = (req as any).user.username;
  alert.acknowledged_at = new Date().toISOString();

  saveDatabase();
  return res.json({ success: true, alert });
});

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------
app.get('/api/v1/audit', authenticateUser, requireRole(['admin', 'auditor']), (req: Request, res: Response) => {
  return res.json({ audit_logs: db.audit_logs.slice(0, 200) });
});

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
app.get('/api/v1/settings', authenticateUser, (req: Request, res: Response) => {
  return res.json({
    settings: db.settings,
    server_info: {
      uptime_seconds: process.uptime(),
      node_version: process.version,
      platform: process.platform,
      hostname: process.env.HOSTNAME || 'localhost',
    },
  });
});

app.put('/api/v1/settings', authenticateUser, requireRole(['admin']), (req: Request, res: Response) => {
  const { heartbeat_timeout_seconds, alert_cpu_threshold_pct, alert_ram_threshold_pct, alert_disk_threshold_pct, company_name } = req.body;

  if (heartbeat_timeout_seconds && Number(heartbeat_timeout_seconds) >= 30) {
    db.settings.heartbeat_timeout_seconds = Number(heartbeat_timeout_seconds);
  }
  if (alert_cpu_threshold_pct) db.settings.alert_cpu_threshold_pct = Number(alert_cpu_threshold_pct);
  if (alert_ram_threshold_pct) db.settings.alert_ram_threshold_pct = Number(alert_ram_threshold_pct);
  if (alert_disk_threshold_pct) db.settings.alert_disk_threshold_pct = Number(alert_disk_threshold_pct);
  if (company_name) db.settings.company_name = String(company_name);

  db.audit_logs.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    user: (req as any).user.username,
    action: 'UPDATE_SETTINGS',
    resource_type: 'SYSTEM',
    details: `Configurações do servidor atualizadas. Timeout de heartbeat: ${db.settings.heartbeat_timeout_seconds}s.`,
    ip_address: String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1'),
  });

  saveDatabase();
  return res.json({ success: true, settings: db.settings });
});

// ---------------------------------------------------------------------------
// Interactive Network Agent Simulator & Real Heartbeat Dispatcher
// (Allows IT admin to simulate real network conditions, test agents, and see
// instant online/offline state change & automatic reconnection recovery)
// ---------------------------------------------------------------------------
const activeSimulators = new Map<string, NodeJS.Timeout>();

app.post('/api/v1/simulator/start', authenticateUser, requireRole(['admin', 'operator']), (req: Request, res: Response) => {
  const { hostname, sector, logged_user, ip_address, interval_sec = 10 } = req.body;

  if (!hostname) return res.status(400).json({ error: 'Hostname é obrigatório.' });

  // Stop previous simulator if running for this hostname
  if (activeSimulators.has(hostname)) {
    clearInterval(activeSimulators.get(hostname)!);
    activeSimulators.delete(hostname);
  }

  // Ensure computer exists or register
  let comp = db.computers.find((c) => c.hostname.toLowerCase() === hostname.toLowerCase());
  if (!comp) {
    const machine_id = crypto.randomUUID();
    const rawSecret = 'sim_' + crypto.randomBytes(16).toString('hex');
    const secretHash = crypto.createHash('sha256').update(rawSecret).digest('hex');

    comp = {
      id: machine_id,
      hostname,
      logged_user: logged_user || 'operador.balanca',
      ip_address: ip_address || `192.168.1.${Math.floor(Math.random() * 200) + 20}`,
      mac_address: `00:1A:2B:${Math.floor(Math.random() * 90 + 10)}:${Math.floor(Math.random() * 90 + 10)}:${Math.floor(Math.random() * 90 + 10)}`,
      sector: sector || 'Produção & Montagem',
      os_name: 'Windows 11 Pro 23H2 (x64)',
      os_build: '22631.3527',
      cpu_model: 'Intel Core i5-13400 @ 2.50GHz',
      cpu_cores: 10,
      cpu_usage_pct: 18.5,
      ram_total_gb: 16.0,
      ram_used_gb: 6.4,
      ram_usage_pct: 40.0,
      disk_total_gb: 512.0,
      disk_used_gb: 198.5,
      disk_usage_pct: 38.7,
      uptime_seconds: 14200,
      agent_version: '1.2.0',
      agent_status: 'running',
      machine_secret_hash: secretHash,
      created_at: new Date().toISOString(),
      last_heartbeat: new Date().toISOString(),
      status: 'online',
      metrics_history: [],
    };
    db.computers.push(comp);
    saveDatabase();
  }

  // Create timer sending real periodic heartbeats
  const timer = setInterval(() => {
    const c = db.computers.find((item) => item.hostname.toLowerCase() === hostname.toLowerCase());
    if (!c) {
      clearInterval(timer);
      activeSimulators.delete(hostname);
      return;
    }

    const now = new Date().toISOString();
    // Simulate slight natural variation in resources
    const cpuVariation = Math.min(99, Math.max(5, c.cpu_usage_pct + (Math.random() * 12 - 6)));
    const ramVariation = Math.min(95, Math.max(20, c.ram_usage_pct + (Math.random() * 4 - 2)));

    c.cpu_usage_pct = Math.round(cpuVariation * 10) / 10;
    c.ram_usage_pct = Math.round(ramVariation * 10) / 10;
    c.ram_used_gb = Math.round(((c.ram_total_gb * c.ram_usage_pct) / 100) * 10) / 10;
    c.uptime_seconds += interval_sec;
    c.last_heartbeat = now;
    c.status = 'online';

    if (!c.metrics_history) c.metrics_history = [];
    c.metrics_history.push({
      timestamp: now,
      cpu_usage_pct: c.cpu_usage_pct,
      ram_usage_pct: c.ram_usage_pct,
      disk_usage_pct: c.disk_usage_pct,
    });
    if (c.metrics_history.length > 60) c.metrics_history.shift();

    saveDatabase();
  }, interval_sec * 1000);

  activeSimulators.set(hostname, timer);

  return res.json({
    success: true,
    message: `Agente simulado para "${hostname}" iniciado com sucesso enviando heartbeats a cada ${interval_sec}s.`,
    computer: comp,
  });
});

app.post('/api/v1/simulator/stop', authenticateUser, requireRole(['admin', 'operator']), (req: Request, res: Response) => {
  const { hostname } = req.body;
  if (!hostname) return res.status(400).json({ error: 'Hostname é obrigatório.' });

  if (activeSimulators.has(hostname)) {
    clearInterval(activeSimulators.get(hostname)!);
    activeSimulators.delete(hostname);
    return res.json({
      success: true,
      message: `Heartbeats do agente "${hostname}" foram interrompidos (simulando desconexão da máquina ou queda de rede).`,
    });
  }

  return res.json({ success: true, message: 'Nenhum simulador ativo para esta máquina.' });
});

app.get('/api/v1/simulator/list', authenticateUser, (req: Request, res: Response) => {
  const running = Array.from(activeSimulators.keys());
  return res.json({ running_simulators: running });
});

// ---------------------------------------------------------------------------
// Production Static Files & Vite Dev Middleware
// ---------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[DIGI-TRON Monitor] Servidor ativo em http://0.0.0.0:${PORT}`);
    console.log(`[DIGI-TRON Monitor] API REST: http://0.0.0.0:${PORT}/api/v1`);
  });
}

startServer().catch((err) => {
  console.error('[DIGI-TRON Monitor] Erro fatal na inicialização do servidor:', err);
  process.exit(1);
});
