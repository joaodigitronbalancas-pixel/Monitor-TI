from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

# ----------------- Auth Schemas -----------------
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    user: "UserResponse"

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

# ----------------- Computer & Telemetry -----------------
class MetricPoint(BaseModel):
    timestamp: datetime
    cpu_usage_pct: float
    ram_usage_pct: float
    disk_usage_pct: float

    class Config:
        from_attributes = True

class ComputerResponse(BaseModel):
    id: str
    hostname: str
    logged_user: str
    ip_address: str
    mac_address: Optional[str] = None
    sector: str
    os_name: str
    os_build: Optional[str] = None
    cpu_model: Optional[str] = None
    cpu_cores: Optional[int] = None
    cpu_usage_pct: float
    ram_total_gb: float
    ram_used_gb: float
    ram_usage_pct: float
    disk_total_gb: float
    disk_used_gb: float
    disk_usage_pct: float
    uptime_seconds: int
    agent_version: str
    agent_status: str
    status: str
    notes: Optional[str] = None
    created_at: datetime
    last_heartbeat: datetime

    class Config:
        from_attributes = True

class ComputerDetailResponse(ComputerResponse):
    metrics_history: List[MetricPoint] = []

class ComputerSectorUpdate(BaseModel):
    sector: str

class ComputerNotesUpdate(BaseModel):
    notes: str

class ComputerListResponse(BaseModel):
    computers: List[ComputerResponse]
    stats: dict

# ----------------- Agent Protocol -----------------
class AgentRegisterRequest(BaseModel):
    enrollment_token: str
    hostname: str
    mac_address: Optional[str] = None
    os_name: Optional[str] = None
    os_build: Optional[str] = None
    cpu_model: Optional[str] = None
    cpu_cores: Optional[int] = None
    ram_total_gb: Optional[float] = None
    disk_total_gb: Optional[float] = None

class AgentRegisterResponse(BaseModel):
    status: str = "success"
    machine_id: str
    machine_secret: str
    server_time: datetime
    heartbeat_interval_sec: int = 60

class AgentHeartbeatRequest(BaseModel):
    machine_id: str
    hostname: Optional[str] = None
    logged_user: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    os_name: Optional[str] = None
    os_build: Optional[str] = None
    cpu_model: Optional[str] = None
    cpu_cores: Optional[int] = None
    cpu_usage_pct: float
    ram_total_gb: Optional[float] = None
    ram_used_gb: Optional[float] = None
    ram_usage_pct: float
    disk_total_gb: Optional[float] = None
    disk_used_gb: Optional[float] = None
    disk_usage_pct: float
    uptime_seconds: int
    agent_version: str
    agent_status: str = "running"

class AgentHeartbeatResponse(BaseModel):
    status: str = "ok"
    server_time: datetime
    next_heartbeat_sec: int = 60

# ----------------- Tokens -----------------
class EnrollmentTokenCreate(BaseModel):
    sector: Optional[str] = "Geral"
    description: Optional[str] = ""
    days_valid: int = 30
    max_uses: int = 50

class EnrollmentTokenResponse(BaseModel):
    token: str
    created_by: str
    created_at: datetime
    expires_at: datetime
    max_uses: int
    current_uses: int
    assigned_sector: str
    description: str
    active: bool

    class Config:
        from_attributes = True

# ----------------- Alerts -----------------
class AlertResponse(BaseModel):
    id: str
    computer_id: str
    computer_name: str
    severity: str
    type: str
    message: str
    created_at: datetime
    acknowledged: bool
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ----------------- Audit Log -----------------
class AuditLogResponse(BaseModel):
    id: str
    timestamp: datetime
    user: str
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: str
    ip_address: str

    class Config:
        from_attributes = True

# ----------------- Settings -----------------
class SettingsUpdate(BaseModel):
    heartbeat_timeout_seconds: Optional[int] = None
    alert_cpu_threshold_pct: Optional[float] = None
    alert_ram_threshold_pct: Optional[float] = None
    alert_disk_threshold_pct: Optional[float] = None
    company_name: Optional[str] = None
