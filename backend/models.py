import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="operator")  # admin, operator, auditor
    failed_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)


class Computer(Base):
    __tablename__ = "computers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    hostname = Column(String(100), index=True, nullable=False)
    logged_user = Column(String(100), default="N/A")
    ip_address = Column(String(45), nullable=False)
    mac_address = Column(String(50), nullable=True, index=True)
    sector = Column(String(100), default="TI & Infraestrutura")
    os_name = Column(String(100), default="Windows 11")
    os_build = Column(String(50), nullable=True)
    cpu_model = Column(String(100), nullable=True)
    cpu_cores = Column(Integer, nullable=True)
    cpu_usage_pct = Column(Float, default=0.0)
    ram_total_gb = Column(Float, default=16.0)
    ram_used_gb = Column(Float, default=0.0)
    ram_usage_pct = Column(Float, default=0.0)
    disk_total_gb = Column(Float, default=512.0)
    disk_used_gb = Column(Float, default=0.0)
    disk_usage_pct = Column(Float, default=0.0)
    uptime_seconds = Column(Integer, default=0)
    agent_version = Column(String(20), default="1.0.0")
    agent_status = Column(String(20), default="running")
    machine_secret_hash = Column(String(64), nullable=False)
    status = Column(String(20), default="online")  # online, offline
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_heartbeat = Column(DateTime, default=datetime.utcnow, index=True)

    metrics = relationship("MetricHistory", back_populates="computer", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="computer", cascade="all, delete-orphan")


class MetricHistory(Base):
    __tablename__ = "metric_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    computer_id = Column(String(36), ForeignKey("computers.id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    cpu_usage_pct = Column(Float, nullable=False)
    ram_usage_pct = Column(Float, nullable=False)
    disk_usage_pct = Column(Float, nullable=False)

    computer = relationship("Computer", back_populates="metrics")


class EnrollmentToken(Base):
    __tablename__ = "enrollment_tokens"

    token = Column(String(64), primary_key=True, index=True)
    created_by = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    max_uses = Column(Integer, default=50)
    current_uses = Column(Integer, default=0)
    assigned_sector = Column(String(100), default="Geral")
    description = Column(String(255), default="")
    active = Column(Boolean, default=True)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    computer_id = Column(String(36), ForeignKey("computers.id"), index=True, nullable=False)
    computer_name = Column(String(100), nullable=False)
    severity = Column(String(20), default="warning")  # critical, warning, info
    type = Column(String(50), nullable=False)  # offline, high_cpu, high_ram, high_disk
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(String(50), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)

    computer = relationship("Computer", back_populates="alerts")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    user = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(36), nullable=True)
    details = Column(Text, nullable=False)
    ip_address = Column(String(45), nullable=False)
