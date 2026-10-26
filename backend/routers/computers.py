from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Computer, AuditLog
from backend.schemas import (
    ComputerResponse,
    ComputerDetailResponse,
    ComputerListResponse,
    ComputerSectorUpdate,
    ComputerNotesUpdate
)
from backend.auth import get_current_user, require_operator_or_admin, require_admin
from backend.config import settings

router = APIRouter(prefix="/computers", tags=["Computadores"])

def update_computers_online_status(db: Session):
    """Calculates online/offline status based on configured heartbeat timeout."""
    threshold_time = datetime.utcnow() - timedelta(seconds=settings.HEARTBEAT_TIMEOUT_SECONDS)
    computers = db.query(Computer).all()
    changed = False

    for comp in computers:
        is_online = comp.last_heartbeat >= threshold_time
        new_status = "online" if is_online else "offline"
        if comp.status != new_status:
            comp.status = new_status
            changed = True
    
    if changed:
        db.commit()

@router.get("", response_model=ComputerListResponse)
def list_computers(
    search: Optional[str] = Query(None, description="Busca por hostname, IP, usuário ou setor"),
    sector: Optional[str] = Query(None, description="Filtrar por setor"),
    status_filter: Optional[str] = Query(None, alias="status", description="online ou offline"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    update_computers_online_status(db)

    query = db.query(Computer)

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            (Computer.hostname.ilike(search_fmt)) |
            (Computer.logged_user.ilike(search_fmt)) |
            (Computer.ip_address.ilike(search_fmt)) |
            (Computer.sector.ilike(search_fmt))
        )

    if sector and sector != "all":
        query = query.filter(Computer.sector == sector)

    if status_filter and status_filter != "all":
        query = query.filter(Computer.status == status_filter)

    computers = query.order_by(Computer.last_heartbeat.desc()).all()

    total = db.query(Computer).count()
    online = db.query(Computer).filter(Computer.status == "online").count()
    offline = total - online

    return ComputerListResponse(
        computers=computers,
        stats={
            "total": total,
            "online": online,
            "offline": offline,
            "heartbeat_timeout_seconds": settings.HEARTBEAT_TIMEOUT_SECONDS
        }
    )

@router.get("/{computer_id}", response_model=ComputerDetailResponse)
def get_computer_detail(
    computer_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    update_computers_online_status(db)
    computer = db.query(Computer).filter(Computer.id == computer_id).first()
    if not computer:
        raise HTTPException(status_code=404, detail="Computador não encontrado.")
    return computer

@router.patch("/{computer_id}/sector")
def update_sector(
    computer_id: str,
    data: ComputerSectorUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(require_operator_or_admin)
):
    computer = db.query(Computer).filter(Computer.id == computer_id).first()
    if not computer:
        raise HTTPException(status_code=404, detail="Computador não encontrado.")

    prev = computer.sector
    computer.sector = data.sector.strip()

    client_ip = request.client.host if request.client else "127.0.0.1"
    log = AuditLog(
        user=current_user.username,
        action="UPDATE_SECTOR",
        resource_type="COMPUTER",
        resource_id=computer.id,
        details=f"Setor alterado de '{prev}' para '{computer.sector}' na máquina {computer.hostname}.",
        ip_address=client_ip
    )
    db.add(log)
    db.commit()
    db.refresh(computer)
    return {"message": "Setor atualizado com sucesso.", "computer": computer}

@router.patch("/{computer_id}/notes")
def update_notes(
    computer_id: str,
    data: ComputerNotesUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_operator_or_admin)
):
    computer = db.query(Computer).filter(Computer.id == computer_id).first()
    if not computer:
        raise HTTPException(status_code=404, detail="Computador não encontrado.")

    computer.notes = data.notes.strip()
    db.commit()
    return {"message": "Anotações salvas com sucesso."}

@router.delete("/{computer_id}")
def delete_computer(
    computer_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    computer = db.query(Computer).filter(Computer.id == computer_id).first()
    if not computer:
        raise HTTPException(status_code=404, detail="Computador não encontrado.")

    client_ip = request.client.host if request.client else "127.0.0.1"
    log = AuditLog(
        user=current_user.username,
        action="DELETE_COMPUTER",
        resource_type="COMPUTER",
        resource_id=computer.id,
        details=f"Máquina {computer.hostname} ({computer.ip_address}) descadastrada do sistema.",
        ip_address=client_ip
    )
    db.add(log)
    db.delete(computer)
    db.commit()
    return {"message": f"Computador {computer.hostname} removido com sucesso."}
