from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database import get_db
from models.certificate import Certificate, CertificateStatus
from api.auth import get_current_user
router = APIRouter()

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    total = db.query(Certificate).count()
    active = db.query(Certificate).filter(Certificate.status == CertificateStatus.ACTIVE).count()
    expired = db.query(Certificate).filter(Certificate.status == CertificateStatus.EXPIRED).count()
    revoked = db.query(Certificate).filter(Certificate.status == CertificateStatus.REVOKED).count()
    return {"total": total, "active": active, "expired": expired, "revoked": revoked}
