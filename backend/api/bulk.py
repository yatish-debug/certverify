from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
from core.database import get_db
from models.certificate import Certificate, CertificateStatus
from models.audit_log import AuditLog
from api.auth import require_role
import csv, io, uuid, hashlib
from datetime import datetime, date

router = APIRouter()
@router.post("/upload")
async def bulk_upload(request: Request, file: UploadFile = File(...), db: Session = Depends(get_db), current_user = Depends(require_role(["SUPERADMIN", "ADMIN"]))):
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode('utf-8')))
    success = 0
    for row in reader:
        try:
            cert_id = str(uuid.uuid4())[:8].upper()
            iss_date = datetime.strptime(row['issue_date'], '%Y-%m-%d').date()
            exp_date = datetime.strptime(row['expiry_date'], '%Y-%m-%d').date() if row.get('expiry_date') else None
            
            c = Certificate(
                cert_id=cert_id, candidate_name=row['candidate_name'], issuer=row['issuer'],
                issue_date=iss_date, expiry_date=exp_date, description=row.get('description',''),
                file_url="/uploads/bulk.pdf", file_hash=hashlib.sha256(cert_id.encode()).hexdigest(),
                status=CertificateStatus.ACTIVE
            )
            db.add(c)
            success += 1
        except: pass
    db.add(AuditLog(action="BULK_CREATE", admin_username=current_user.username, details=f"Created {success} certs", ip_address=request.client.host))
    db.commit()
    return {"message": f"Successfully imported {success} certificates"}
