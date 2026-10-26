from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User, AuditLog
from backend.schemas import LoginRequest, TokenResponse, UserResponse, PasswordChangeRequest
from backend.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user
)

router = APIRouter(prefix="/auth", tags=["Autenticação"])

@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "127.0.0.1"
    
    user = db.query(User).filter(User.username == login_data.username.strip()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas."
        )

    # Brute force check
    if user.locked_until and user.locked_until > datetime.utcnow():
        remaining = int((user.locked_until - datetime.utcnow()).total_seconds() / 60)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Conta bloqueada temporariamente. Tente novamente em {remaining + 1} minuto(s)."
        )

    if not verify_password(login_data.password, user.password_hash):
        user.failed_attempts += 1
        if user.failed_attempts >= 5:
            user.locked_until = datetime.utcnow() + timedelta(minutes=15)
            log = AuditLog(
                user=user.username,
                action="ACCOUNT_LOCKED",
                resource_type="AUTH",
                details=f"Conta bloqueada por 15min após 5 tentativas incorretas a partir do IP {client_ip}.",
                ip_address=client_ip
            )
            db.add(log)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas."
        )

    # Success: reset attempts
    user.failed_attempts = 0
    user.locked_until = None
    user.last_login = datetime.utcnow()

    # Log successful login
    log = AuditLog(
        user=user.username,
        action="LOGIN_SUCCESS",
        resource_type="AUTH",
        details="Login efetuado com sucesso via painel web.",
        ip_address=client_ip
    )
    db.add(log)
    db.commit()

    token = create_access_token(data={"sub": user.id, "username": user.username, "role": user.role})
    return TokenResponse(token=token, user=user)

@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/change-password")
def change_password(
    data: PasswordChangeRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha atual incorreta."
        )

    current_user.password_hash = get_password_hash(data.new_password)
    log = AuditLog(
        user=current_user.username,
        action="PASSWORD_CHANGED",
        resource_type="AUTH",
        details="Senha alterada com sucesso.",
        ip_address=client_ip
    )
    db.add(log)
    db.commit()
    return {"message": "Senha alterada com sucesso."}
