from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import AuditLog
from backend.schemas import SettingsUpdate
from backend.auth import require_admin
from backend.config import settings

router = APIRouter(prefix="/settings", tags=["Configurações"])

@router.get("")
def get_system_settings(current_user = Depends(require_admin)):
    return {
        "heartbeat_timeout_seconds": settings.HEARTBEAT_TIMEOUT_SECONDS,
        "alert_cpu_threshold_pct": settings.ALERT_CPU_THRESHOLD_PCT,
        "alert_ram_threshold_pct": settings.ALERT_RAM_THRESHOLD_PCT,
        "alert_disk_threshold_pct": settings.ALERT_DISK_THRESHOLD_PCT,
        "app_name": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "server_host": settings.SERVER_HOST,
        "server_port": settings.SERVER_PORT
    }

@router.put("")
def update_system_settings(
    data: SettingsUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    if data.heartbeat_timeout_seconds is not None:
        settings.HEARTBEAT_TIMEOUT_SECONDS = data.heartbeat_timeout_seconds
    if data.alert_cpu_threshold_pct is not None:
        settings.ALERT_CPU_THRESHOLD_PCT = data.alert_cpu_threshold_pct
    if data.alert_ram_threshold_pct is not None:
        settings.ALERT_RAM_THRESHOLD_PCT = data.alert_ram_threshold_pct
    if data.alert_disk_threshold_pct is not None:
        settings.ALERT_DISK_THRESHOLD_PCT = data.alert_disk_threshold_pct

    client_ip = request.client.host if request.client else "127.0.0.1"
    log = AuditLog(
        user=current_user.username,
        action="UPDATE_SETTINGS",
        resource_type="SYSTEM",
        details=f"Parâmetros de monitoramento atualizados. Timeout: {settings.HEARTBEAT_TIMEOUT_SECONDS}s.",
        ip_address=client_ip
    )
    db.add(log)
    db.commit()

    return {"message": "Configurações salvas com sucesso.", "settings": get_system_settings(current_user)}
