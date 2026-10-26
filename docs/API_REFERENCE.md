# Especificação da API REST - DIGI-TRON Monitor v1.2

Todas as rotas da API estão sob o prefixo `/api/v1`.

---

## 1. Autenticação Administrativa

### `POST /api/v1/auth/login`
Autentica administradores no painel web. Proteção contra força bruta: bloqueia a conta por 15 minutos após 5 tentativas incorretas.

**Request Body:**
```json
{
  "username": "admin",
  "password": "Admin@Digitron2026!"
}
```

**Response (200 OK):**
```json
{
  "token": "d748f2a93940294...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@digitron.local",
    "role": "admin"
  }
}
```

---

## 2. Protocolo do Agente

### `POST /api/v1/agent/register`
Matrícula inicial do computador. Requer token de matrícula autorizado.

**Request Body:**
```json
{
  "enrollment_token": "DIGITRON-CORP-2026",
  "hostname": "PROD-NOTE-01",
  "mac_address": "00:1A:2B:3C:4D:5E",
  "os_name": "Windows 11 Pro 23H2",
  "os_build": "22631.3447",
  "cpu_model": "Intel Core i7-12700H",
  "cpu_cores": 14,
  "ram_total_gb": 32.0,
  "disk_total_gb": 512.0
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "machine_id": "a92e1058-299f-43f1-b9fa-3f95b6c3d18e",
  "machine_secret": "e8f73b185938c...",
  "server_time": "2026-10-26T12:00:00Z",
  "heartbeat_interval_sec": 60
}
```

### `POST /api/v1/agent/heartbeat`
Envio periódico de telemetria a cada 60s.

**Headers:**
- `Authorization: Bearer <machine_secret>`
- `X-Machine-ID: <machine_id>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "machine_id": "a92e1058-299f-43f1-b9fa-3f95b6c3d18e",
  "hostname": "PROD-NOTE-01",
  "logged_user": "joao.silva",
  "ip_address": "192.168.1.45",
  "mac_address": "00:1A:2B:3C:4D:5E",
  "os_name": "Windows 11 Pro 23H2",
  "cpu_usage_pct": 28.4,
  "ram_total_gb": 32.0,
  "ram_used_gb": 12.8,
  "ram_usage_pct": 40.0,
  "disk_total_gb": 512.0,
  "disk_used_gb": 218.4,
  "disk_usage_pct": 42.7,
  "uptime_seconds": 86400,
  "agent_version": "1.2.0",
  "agent_status": "running"
}
```

---

## 3. Gestão de Computadores

- `GET /api/v1/computers`: Lista todos os computadores cadastrados com filtros (`search`, `sector`, `status`).
- `GET /api/v1/computers/{id}`: Detalhes da máquina incluindo histórico de métricas e alertas vinculados.
- `PATCH /api/v1/computers/{id}/sector`: Atualiza o setor da máquina.
- `PATCH /api/v1/computers/{id}/notes`: Salva anotações administrativas da TI.
- `DELETE /api/v1/computers/{id}`: Remove a máquina do inventário (restrito a admin).
- `GET /api/v1/alerts`: Lista alertas operacionais recentes.
- `POST /api/v1/alerts/{id}/ack`: Marca alerta como reconhecido pela equipe de TI.
- `GET /api/v1/audit`: Trilha de auditoria das ações administrativas.
- `GET /api/v1/settings` e `PUT /api/v1/settings`: Configuração de timeouts e limites de alerta.
