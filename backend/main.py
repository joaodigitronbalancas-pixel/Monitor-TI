from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.database import Base, engine, SessionLocal
from backend.models import User, EnrollmentToken, AuditLog
from backend.auth import get_password_hash
from backend.routers import auth, computers, agent, alerts, audit, settings as settings_router
import datetime

# Create database tables
Base.metadata.create_all(bind=engine)

# Seed default admin user if database is empty
def seed_initial_data():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            default_admin = User(
                username="admin",
                email="admin@digitron.local",
                password_hash=get_password_hash("Admin@Digitron2026!"),
                role="admin"
            )
            db.add(default_admin)

            # Create initial enrollment token
            init_token = EnrollmentToken(
                token="DIGITRON-CORP-2026",
                created_by="system",
                expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=90),
                max_uses=100,
                current_uses=0,
                assigned_sector="TI & Infraestrutura",
                description="Token corporativo inicial de implantação DIGI-TRON",
                active=True
            )
            db.add(init_token)

            db.add(AuditLog(
                user="system",
                action="SYSTEM_INIT",
                resource_type="SYSTEM",
                details="Servidor Central DIGI-TRON Monitor inicializado com sucesso.",
                ip_address="127.0.0.1"
            ))
            db.commit()
    finally:
        db.close()

seed_initial_data()

app = FastAPI(
    title="DIGI-TRON Monitor API",
    description="Servidor Central de Monitoramento de Rede Corporativa Windows - DIGI-TRON Balanças",
    version="1.2.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(computers.router, prefix="/api/v1")
app.include_router(agent.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(audit.router, prefix="/api/v1")
app.include_router(settings_router.router, prefix="/api/v1")

@app.get("/health", tags=["Saúde"])
def health_check():
    return {
        "status": "healthy",
        "service": "DIGI-TRON Monitor Central Server",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
