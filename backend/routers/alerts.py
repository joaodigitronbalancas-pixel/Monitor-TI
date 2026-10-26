from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Alert, AuditLog
from backend.schemas import AlertResponse
from backend.auth import get_current_user, require_operator_or_admin

router = APIRouter(prefix="/alerts", tags=["Alertas"])

@router.get("", response_model=List[AlertResponse])
def list_alerts(
    acknowledged: Optional[bool] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Alert)
    if acknowledged is not None:
        query = query.filter(Alert.acknowledged == acknowledged)
    return query.order_by(Alert.created_at.desc()).limit(limit).all()

@router.post("/{alert_id}/ack")
def acknowledge_alert(
    alert_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(require_operator_or_admin)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta não encontrado.")

    alert.acknowledged = True
    alert.acknowledged_by = current_user.username
    alert.acknowledged_at = datetime.utcnow()

    client_ip = request.client.host if request.client else "127.0.0.1"
    log = AuditLog(
        user=current_user.username,
        action="ACKNOWLEDGE_ALERT",
        resource_type="ALERT",
        resource_id=alert.id,
        details=f"Alerta '{alert.type}' da máquina '{alert.computer_name}' reconhecido.",
        ip_address=client_ip
    )
    db.add(log)
    db.commit()
    return {"message": "Alerta reconhecido com sucesso."}
