from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from core.database import get_db
from models.certificate import Certificate, CertificateStatus
from models.audit_log import AuditLog
from api.auth import get_current_user, require_role
import uuid, hashlib, os
from datetime import datetime

router = APIRouter()
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def cert_to_dict(cert):
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
        "created_at": str(cert.created_at) if cert.created_at else None,
    }

@router.post("/")
async def create_certificate(
    request: Request,
    candidate_name: str = Form(...), issuer: str = Form(...), issue_date: str = Form(...),
    expiry_date: str = Form(None), description: str = Form(None),
    cert_id: str = Form(None), file: UploadFile = File(...),
    qr_fg_color: str = Form("#0F172A"), qr_bg_color: str = Form("#FFFFFF"),
    db: Session = Depends(get_db), current_user = Depends(require_role(["SUPERADMIN", "ADMIN"]))
):
    if cert_id and cert_id.strip():
        cert_id = cert_id.strip().upper()
        existing = db.query(Certificate).filter(Certificate.cert_id == cert_id).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Certificate ID '{cert_id}' already exists. Please use a unique ID.")
    else:
        cert_id = str(uuid.uuid4())[:8].upper()
    
    file_path = os.path.join(UPLOAD_DIR, f"{cert_id}_{file.filename}")
    content = await file.read()
    file_hash = hashlib.sha256(content).hexdigest()
    with open(file_path, "wb") as f: f.write(content)
    
    iss_date = datetime.strptime(issue_date, "%Y-%m-%d").date()
    exp_date = datetime.strptime(expiry_date, "%Y-%m-%d").date() if expiry_date else None
    
    cert = Certificate(
        cert_id=cert_id, candidate_name=candidate_name, issuer=issuer, issue_date=iss_date,
        expiry_date=exp_date, description=description, file_url=f"/{file_path}", file_hash=file_hash,
        qr_fg_color=qr_fg_color, qr_bg_color=qr_bg_color
    )
    db.add(cert)
    db.add(AuditLog(action="CREATE_CERT", admin_username=current_user.username, target_id=cert_id, ip_address=request.client.host))
    db.commit()
    return {"cert_id": cert_id, "message": "Certificate created successfully"}

@router.get("/")
def get_certificates(skip: int = 0, limit: int = 100, search: str = "", db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    query = db.query(Certificate)
    if search: query = query.filter(Certificate.cert_id.contains(search) | Certificate.candidate_name.contains(search))
    certs = query.offset(skip).limit(limit).all()
    return {"total": query.count(), "items": [cert_to_dict(c) for c in certs]}

@router.put("/{cert_id}")
def update_certificate(
    cert_id: str, request: Request,
    candidate_name: str = Form(...), issuer: str = Form(...),
    issue_date: str = Form(...), expiry_date: str = Form(None),
    description: str = Form(None), status: str = Form(None),
    qr_fg_color: str = Form(None), qr_bg_color: str = Form(None),
    db: Session = Depends(get_db), current_user = Depends(require_role(["SUPERADMIN", "ADMIN"]))
):
    cert = db.query(Certificate).filter(Certificate.cert_id == cert_id).first()
    if not cert: raise HTTPException(status_code=404, detail="Certificate not found")
    cert.candidate_name = candidate_name
    cert.issuer = issuer
    cert.issue_date = datetime.strptime(issue_date, "%Y-%m-%d").date()
    cert.expiry_date = datetime.strptime(expiry_date, "%Y-%m-%d").date() if expiry_date else None
    cert.description = description
    if status and status in [s.value for s in CertificateStatus]:
        cert.status = status
    if qr_fg_color:
        cert.qr_fg_color = qr_fg_color
    if qr_bg_color:
        cert.qr_bg_color = qr_bg_color
    db.add(AuditLog(action="UPDATE_CERT", admin_username=current_user.username, target_id=cert_id, ip_address=request.client.host))
    db.commit()
    return {"message": "Certificate updated successfully", "cert_id": cert_id}

@router.delete("/{cert_id}")
def delete_certificate(cert_id: str, request: Request, db: Session = Depends(get_db), current_user = Depends(require_role(["SUPERADMIN"]))):
    cert = db.query(Certificate).filter(Certificate.cert_id == cert_id).first()
    if not cert: raise HTTPException(status_code=404)
    
    file_path = cert.file_url.lstrip('/')
    if os.path.exists(file_path):
        os.remove(file_path)
        
    db.delete(cert)
    db.add(AuditLog(action="DELETE_CERT", admin_username=current_user.username, target_id=cert_id, ip_address=request.client.host))
    db.commit()
    return {"message": "Deleted"}
