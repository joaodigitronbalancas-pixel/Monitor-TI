import secrets
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Computer, EnrollmentToken, MetricHistory, Alert, AuditLog
from backend.schemas import (
    AgentRegisterRequest,
    AgentRegisterResponse,
    AgentHeartbeatRequest,
    AgentHeartbeatResponse,
    EnrollmentTokenCreate,
    EnrollmentTokenResponse
)
from backend.auth import hash_secret, get_current_user, require_admin
from backend.config import settings

router = APIRouter(prefix="/agent", tags=["Protocolo do Agente"])

@router.post("/register", response_model=AgentRegisterResponse, status_code=status.HTTP_201_CREATED)
def register_agent(
    payload: AgentRegisterRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Initial registration for a new Windows Agent using an authorized enrollment token.
    Generates a unique machine_id and machine_secret.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"

    token_record = db.query(EnrollmentToken).filter(
        EnrollmentToken.token == payload.enrollment_token,
        EnrollmentToken.active == True
    ).first()

    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token de matrícula inválido ou inativo."
        )

    if token_record.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token de matrícula expirado."
        )

    if token_record.max_uses > 0 and token_record.current_uses >= token_record.max_uses:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Limite de instalações para este token esgotado."
        )

    # Check if existing computer
    existing = None
    if payload.mac_address:
        existing = db.query(Computer).filter(Computer.mac_address == payload.mac_address).first()
    if not existing:
        existing = db.query(Computer).filter(Computer.hostname == payload.hostname).first()

    machine_id = existing.id if existing else str(uuid.uuid4())
    raw_secret = secrets.token_hex(32)
    secret_hash = hash_secret(raw_secret)
    now = datetime.utcnow()

    if existing:
        existing.machine_secret_hash = secret_hash
        existing.hostname = payload.hostname
        existing.ip_address = client_ip
        existing.mac_address = payload.mac_address
        existing.status = "online"
        existing.last_heartbeat = now
        if payload.os_name:
            existing.os_name = payload.os_name
        if payload.cpu_model:
            existing.cpu_model = payload.cpu_model
        if payload.cpu_cores:
            existing.cpu_cores = payload.cpu_cores
        if payload.ram_total_gb:
            existing.ram_total_gb = payload.ram_total_gb
        if payload.disk_total_gb:
            existing.disk_total_gb = payload.disk_total_gb
    else:
        new_comp = Computer(
            id=machine_id,
            hostname=payload.hostname,
            logged_user="N/A",
            ip_address=client_ip,
            mac_address=payload.mac_address,
            sector=token_record.assigned_sector or "Geral",
            os_name=payload.os_name or "Windows 11",
            os_build=payload.os_build,
            cpu_model=payload.cpu_model,
            cpu_cores=payload.cpu_cores,
            cpu_usage_pct=0.0,
            ram_total_gb=payload.ram_total_gb or 16.0,
            ram_used_gb=0.0,
            ram_usage_pct=0.0,
            disk_total_gb=payload.disk_total_gb or 512.0,
            disk_used_gb=0.0,
            disk_usage_pct=0.0,
            uptime_seconds=0,
            agent_version="1.0.0",
            agent_status="running",
            machine_secret_hash=secret_hash,
            status="online",
            last_heartbeat=now
        )
        db.add(new_comp)

    token_record.current_uses += 1

    log = AuditLog(
        user="AGENT_HANDSHAKE",
        action="REGISTER_SUCCESS",
        resource_type="COMPUTER",
        resource_id=machine_id,
        details=f"Agente registrado com sucesso na máquina {payload.hostname} ({client_ip}).",
        ip_address=client_ip
    )
    db.add(log)
    db.commit()

    return AgentRegisterResponse(
        machine_id=machine_id,
        machine_secret=raw_secret,
        server_time=now,
        heartbeat_interval_sec=60
    )

@router.post("/heartbeat", response_model=AgentHeartbeatResponse)
def receive_heartbeat(
    payload: AgentHeartbeatRequest,
    request: Request,
    authorization: str = Header(..., description="Bearer <machine_secret>"),
    x_machine_id: str = Header(..., alias="X-Machine-ID"),
    db: Session = Depends(get_db)
):
    """
    Authenticated telemetry heartbeat sent every 60 seconds by the Windows Agent.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Header de autorização inválido.")

    raw_secret = authorization.split("Bearer ")[1].strip()
    secret_hash = hash_secret(raw_secret)

    computer = db.query(Computer).filter(Computer.id == x_machine_id).first()
    if not computer:
        raise HTTPException(status_code=404, detail="Computador não encontrado ou não matriculado.")

    if computer.machine_secret_hash != secret_hash:
        raise HTTPException(status_code=403, detail="Segredo da máquina inválido.")

    client_ip = payload.ip_address or (request.client.host if request.client else "127.0.0.1")
    now = datetime.utcnow()
    was_offline = computer.status == "offline"

    # Update telemetry fields
    if payload.hostname:
        computer.hostname = payload.hostname
    if payload.logged_user is not None:
        computer.logged_user = payload.logged_user
    computer.ip_address = client_ip
    if payload.mac_address:
        computer.mac_address = payload.mac_address
    if payload.os_name:
        computer.os_name = payload.os_name
    if payload.os_build:
        computer.os_build = payload.os_build
    if payload.cpu_model:
        computer.cpu_model = payload.cpu_model
    if payload.cpu_cores is not None:
        computer.cpu_cores = payload.cpu_cores

    computer.cpu_usage_pct = payload.cpu_usage_pct
    if payload.ram_total_gb is not None:
        computer.ram_total_gb = payload.ram_total_gb
    if payload.ram_used_gb is not None:
        computer.ram_used_gb = payload.ram_used_gb
    computer.ram_usage_pct = payload.ram_usage_pct

    if payload.disk_total_gb is not None:
        computer.disk_total_gb = payload.disk_total_gb
    if payload.disk_used_gb is not None:
        computer.disk_used_gb = payload.disk_used_gb
    computer.disk_usage_pct = payload.disk_usage_pct

    computer.uptime_seconds = payload.uptime_seconds
    computer.agent_version = payload.agent_version
    computer.agent_status = payload.agent_status
    computer.last_heartbeat = now
    computer.status = "online"

    # Add historical metric point
    metric = MetricHistory(
        computer_id=computer.id,
        timestamp=now,
        cpu_usage_pct=payload.cpu_usage_pct,
        ram_usage_pct=payload.ram_usage_pct,
        disk_usage_pct=payload.disk_usage_pct
    )
    db.add(metric)

    # Threshold alerts check
    if payload.cpu_usage_pct >= settings.ALERT_CPU_THRESHOLD_PCT:
        alert = Alert(
            computer_id=computer.id,
            computer_name=computer.hostname,
            severity="warning",
            type="high_cpu",
            message=f"CPU em {payload.cpu_usage_pct:.1f}% ultrapassou o limite operacional de {settings.ALERT_CPU_THRESHOLD_PCT}%."
        )
        db.add(alert)

    if payload.ram_usage_pct >= settings.ALERT_RAM_THRESHOLD_PCT:
        alert = Alert(
            computer_id=computer.id,
            computer_name=computer.hostname,
            severity="warning",
            type="high_ram",
            message=f"Memória RAM em {payload.ram_usage_pct:.1f}% ultrapassou o limite operacional de {settings.ALERT_RAM_THRESHOLD_PCT}%."
        )
        db.add(alert)

    if payload.disk_usage_pct >= settings.ALERT_DISK_THRESHOLD_PCT:
        alert = Alert(
            computer_id=computer.id,
            computer_name=computer.hostname,
            severity="critical",
            type="high_disk",
            message=f"Espaço em disco em {payload.disk_usage_pct:.1f}% ultrapassou o limite seguro de {settings.ALERT_DISK_THRESHOLD_PCT}%."
        )
        db.add(alert)

    if was_offline:
        log = AuditLog(
            user="MONITOR_DAEMON",
            action="STATUS_RECOVERY",
            resource_type="COMPUTER",
            resource_id=computer.id,
            details=f"Máquina {computer.hostname} restabeleceu comunicação e está ONLINE.",
            ip_address=client_ip
        )
        db.add(log)

    db.commit()

    return AgentHeartbeatResponse(
        status="ok",
        server_time=now,
        next_heartbeat_sec=60
    )

# ----------------- Enrollment Token Endpoints -----------------
@router.post("/tokens", response_model=EnrollmentTokenResponse, status_code=status.HTTP_201_CREATED)
def create_enrollment_token(
    data: EnrollmentTokenCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    token_str = "DIGITRON-" + secrets.token_hex(6).upper()
    expires_at = datetime.utcnow() + timedelta(days=data.days_valid)

    new_token = EnrollmentToken(
        token=token_str,
        created_by=current_user.username,
        expires_at=expires_at,
        max_uses=data.max_uses,
        current_uses=0,
        assigned_sector=data.sector or "Geral",
        description=data.description or "Token gerado pelo administrador",
        active=True
    )
    db.add(new_token)

    client_ip = request.client.host if request.client else "127.0.0.1"
    log = AuditLog(
        user=current_user.username,
        action="CREATE_TOKEN",
        resource_type="ENROLLMENT_TOKEN",
        details=f"Token {token_str} gerado para o setor '{new_token.assigned_sector}'.",
        ip_address=client_ip
    )
    db.add(log)
    db.commit()
    db.refresh(new_token)
    return new_token
