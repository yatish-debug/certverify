from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from core.database import get_db
from core.limiter import limiter
from models.certificate import Certificate, CertificateStatus
from models.audit_log import AuditLog

router = APIRouter()

@router.get("/hash/{file_hash}")
@limiter.limit("10/minute")
def verify_certificate_by_hash(request: Request, file_hash: str, db: Session = Depends(get_db)):
    cert = db.query(Certificate).filter(Certificate.file_hash == file_hash).first()
    if not cert:
        db.add(AuditLog(action="VERIFY_HASH_FAILED", target_id=file_hash[:8], ip_address=request.client.host))
        db.commit()
        raise HTTPException(status_code=404, detail="Certificate file hash not found or file has been tampered with.")
    
    db.add(AuditLog(action="VERIFY_HASH_SUCCESS", target_id=cert.cert_id, ip_address=request.client.host))
    db.commit()
    
    # Query history logs
    history = db.query(AuditLog).filter(AuditLog.target_id == cert.cert_id).order_by(AuditLog.timestamp.asc()).all()
    history_list = [
        {
            "action": h.action,
            "timestamp": str(h.timestamp),
            "ip_address": h.ip_address,
            "details": h.details
        } for h in history
    ]
    
    return {
        "id": cert.id,
        "cert_id": cert.cert_id,
        "candidate_name": cert.candidate_name,
        "issuer": cert.issuer,
        "issue_date": str(cert.issue_date) if cert.issue_date else None,
        "expiry_date": str(cert.expiry_date) if cert.expiry_date else None,
        "description": cert.description,
        "file_url": cert.file_url,
        "file_hash": cert.file_hash,
        "status": cert.status,
        "qr_fg_color": getattr(cert, 'qr_fg_color', '#0F172A'),
        "qr_bg_color": getattr(cert, 'qr_bg_color', '#FFFFFF'),
        "history": history_list,
        "created_at": str(cert.created_at) if cert.created_at else None,
    }

@router.get("/{cert_id}")
@limiter.limit("10/minute")
def verify_certificate(request: Request, cert_id: str, db: Session = Depends(get_db)):
    cert = db.query(Certificate).filter(Certificate.cert_id == cert_id).first()
    if not cert:
        db.add(AuditLog(action="VERIFY_FAILED", target_id=cert_id, ip_address=request.client.host))
        db.commit()
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    db.add(AuditLog(action="VERIFY_SUCCESS", target_id=cert_id, ip_address=request.client.host))
    db.commit()
    
    # Query history logs
    history = db.query(AuditLog).filter(AuditLog.target_id == cert_id).order_by(AuditLog.timestamp.asc()).all()
    history_list = [
        {
            "action": h.action,
            "timestamp": str(h.timestamp),
            "ip_address": h.ip_address,
            "details": h.details
        } for h in history
    ]
    
    return {
        "id": cert.id,
        "cert_id": cert.cert_id,
        "candidate_name": cert.candidate_name,
        "issuer": cert.issuer,
        "issue_date": str(cert.issue_date) if cert.issue_date else None,
        "expiry_date": str(cert.expiry_date) if cert.expiry_date else None,
        "description": cert.description,
        "file_url": cert.file_url,
        "file_hash": cert.file_hash,
        "status": cert.status,
        "qr_fg_color": getattr(cert, 'qr_fg_color', '#0F172A'),
        "qr_bg_color": getattr(cert, 'qr_bg_color', '#FFFFFF'),
        "history": history_list,
        "created_at": str(cert.created_at) if cert.created_at else None,
    }
