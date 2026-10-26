from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import AuditLog
from backend.schemas import AuditLogResponse
from backend.auth import get_current_user, require_admin

router = APIRouter(prefix="/audit", tags=["Auditoria"])

@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = Query(200, le=1000),
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
