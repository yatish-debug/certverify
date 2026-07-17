import os
from pathlib import Path

base = Path('backend')
for d in ['core', 'models', 'schemas', 'crud', 'api']:
    (base / d).mkdir(parents=True, exist_ok=True)
    (base / d / '__init__.py').write_text('')

(base / 'core' / 'database.py').write_text('''import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./certverify.db")
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()
''')

(base / 'core' / 'limiter.py').write_text('''from slowapi import Limiter
from slowapi.util import get_remote_address
limiter = Limiter(key_func=get_remote_address)
''')

(base / 'core' / 'security.py').write_text('''from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "your-super-secret-key-for-certverify-flagship"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def verify_password(plain_password, hashed_password): return pwd_context.verify(plain_password, hashed_password)
def get_password_hash(password): return pwd_context.hash(password)
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
''')

(base / 'models' / 'admin.py').write_text('''from sqlalchemy import Column, Integer, String
from core.database import Base
class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="ADMIN")
''')

(base / 'models' / 'certificate.py').write_text('''from sqlalchemy import Column, Integer, String, Date, Enum, DateTime
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
    created_at = Column(DateTime, default=datetime.utcnow)
''')

(base / 'models' / 'audit_log.py').write_text('''from sqlalchemy import Column, Integer, String, DateTime
from core.database import Base
from datetime import datetime
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String)
    admin_username = Column(String, nullable=True)
    target_id = Column(String, nullable=True)
    ip_address = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    details = Column(String, nullable=True)
''')

(base / 'schemas' / 'admin.py').write_text('''from pydantic import BaseModel
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
class AdminBase(BaseModel): username: str; role: str
''')

(base / 'schemas' / 'certificate.py').write_text('''from pydantic import BaseModel
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
''')

(base / 'crud' / 'certificate.py').write_text('''from sqlalchemy.orm import Session
from models.certificate import Certificate
def get_certificate_by_id(db: Session, cert_id: str): return db.query(Certificate).filter(Certificate.cert_id == cert_id).first()
''')

(base / 'api' / 'auth.py').write_text('''from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import verify_password, create_access_token, SECRET_KEY, ALGORITHM
from models.admin import Admin
from models.audit_log import AuditLog
from schemas.admin import Token
from jose import jwt, JWTError

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None: raise HTTPException(status_code=401)
    except JWTError: raise HTTPException(status_code=401)
    user = db.query(Admin).filter(Admin.username == username).first()
    if user is None: raise HTTPException(status_code=401)
    return user

def require_role(roles: list):
    def role_checker(user: Admin = Depends(get_current_user)):
        if user.role not in roles: raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

@router.post("/login", response_model=Token)
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(Admin).filter(Admin.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        db.add(AuditLog(action="LOGIN_FAILED", target_id=form_data.username, ip_address=request.client.host))
        db.commit()
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    token = create_access_token(data={"sub": user.username, "role": user.role})
    db.add(AuditLog(action="LOGIN_SUCCESS", admin_username=user.username, ip_address=request.client.host))
    db.commit()
    return {"access_token": token, "token_type": "bearer", "role": user.role}
''')

(base / 'api' / 'certificates.py').write_text('''from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
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

@router.post("/")
async def create_certificate(
    request: Request,
    candidate_name: str = Form(...), issuer: str = Form(...), issue_date: str = Form(...),
    expiry_date: str = Form(None), description: str = Form(None), file: UploadFile = File(...),
    db: Session = Depends(get_db), current_user = Depends(require_role(["SUPERADMIN", "ADMIN"]))
):
    cert_id = str(uuid.uuid4())[:8].upper()
    file_path = os.path.join(UPLOAD_DIR, f"{cert_id}_{file.filename}")
    
    content = await file.read()
    file_hash = hashlib.sha256(content).hexdigest()
    with open(file_path, "wb") as f: f.write(content)
    
    iss_date = datetime.strptime(issue_date, "%Y-%m-%d").date()
    exp_date = datetime.strptime(expiry_date, "%Y-%m-%d").date() if expiry_date else None
    
    cert = Certificate(
        cert_id=cert_id, candidate_name=candidate_name, issuer=issuer, issue_date=iss_date,
        expiry_date=exp_date, description=description, file_url=f"/{file_path}", file_hash=file_hash
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
    return {"total": query.count(), "items": certs}

@router.delete("/{cert_id}")
def delete_certificate(cert_id: str, request: Request, db: Session = Depends(get_db), current_user = Depends(require_role(["SUPERADMIN"]))):
    cert = db.query(Certificate).filter(Certificate.cert_id == cert_id).first()
    if not cert: raise HTTPException(status_code=404)
    db.delete(cert)
    db.add(AuditLog(action="DELETE_CERT", admin_username=current_user.username, target_id=cert_id, ip_address=request.client.host))
    db.commit()
    return {"message": "Deleted"}
''')

(base / 'api' / 'bulk.py').write_text('''from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
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
''')

(base / 'api' / 'verify.py').write_text('''from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from core.database import get_db
from core.limiter import limiter
from models.certificate import Certificate, CertificateStatus
from models.audit_log import AuditLog

router = APIRouter()
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
    return cert
''')

(base / 'api' / 'system.py').write_text('''from fastapi import APIRouter, Depends
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
''')

(base / 'api' / 'audit.py').write_text('''from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database import get_db
from models.audit_log import AuditLog
from api.auth import require_role
router = APIRouter()

@router.get("/")
def get_audit_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(require_role(["SUPERADMIN"]))):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    return {"total": db.query(AuditLog).count(), "items": logs}
''')

(base / 'api' / '__init__.py').write_text('''from fastapi import APIRouter
from . import auth, certificates, bulk, verify, system, audit

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(certificates.router, prefix="/certificates", tags=["certificates"])
api_router.include_router(bulk.router, prefix="/bulk", tags=["bulk"])
api_router.include_router(verify.router, prefix="/verify", tags=["verify"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
''')

(base / 'main.py').write_text('''from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from core.limiter import limiter
from core.database import engine, Base, SessionLocal
from api import api_router
from models.admin import Admin
from core.security import get_password_hash
import os

Base.metadata.create_all(bind=engine)
db = SessionLocal()
try:
    if not db.query(Admin).filter(Admin.username == "admin").first():
        db.add(Admin(username="admin", hashed_password=get_password_hash("admin123"), role="SUPERADMIN"))
        db.commit()
finally: db.close()

app = FastAPI(title="CertVerify API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, lambda req, exc: Response("Rate limit exceeded", status_code=429))
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
''')

print('All 17 files rewritten!')
