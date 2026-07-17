from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database import get_db
from models.audit_log import AuditLog
from api.auth import require_role
router = APIRouter()

@router.get("/")
def get_audit_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(require_role(["SUPERADMIN"]))):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    return {"total": db.query(AuditLog).count(), "items": logs}
