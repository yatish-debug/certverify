from sqlalchemy import Column, Integer, String, Date, Enum, DateTime
from core.database import Base
from datetime import datetime
import enum

class CertificateStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"

class Certificate(Base):
    __tablename__ = "certificates"
    id = Column(Integer, primary_key=True, index=True)
    cert_id = Column(String, unique=True, index=True)
    candidate_name = Column(String, index=True)
    issuer = Column(String)
    issue_date = Column(Date)
    expiry_date = Column(Date, nullable=True)
    description = Column(String, nullable=True)
    file_url = Column(String)
    file_hash = Column(String)
    status = Column(String, default=CertificateStatus.ACTIVE)
    qr_fg_color = Column(String, default="#0F172A")
    qr_bg_color = Column(String, default="#FFFFFF")
    created_at = Column(DateTime, default=datetime.utcnow)
