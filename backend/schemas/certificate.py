from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
class CertificateBase(BaseModel):
    candidate_name: str
    issuer: str
    issue_date: date
    expiry_date: Optional[date] = None
    description: Optional[str] = None
class CertificateCreate(CertificateBase): pass
class CertificateUpdate(CertificateBase): status: str
class CertificateOut(CertificateBase):
    cert_id: str
    file_url: str
    status: str
    created_at: datetime
    class Config: from_attributes = True
