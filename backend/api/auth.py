from fastapi import APIRouter, Depends, HTTPException, Request
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

from pydantic import BaseModel
import pyotp

class MfaLoginRequest(BaseModel):
    username: str
    otp_code: str

class MfaEnableRequest(BaseModel):
    secret: str
    otp_code: str

@router.post("/login", response_model=Token)
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(Admin).filter(Admin.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        db.add(AuditLog(action="LOGIN_FAILED", target_id=form_data.username, ip_address=request.client.host))
        db.commit()
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    if getattr(user, 'mfa_enabled', False):
        return {
            "access_token": "",
            "token_type": "bearer",
            "role": user.role,
            "mfa_required": True,
            "username": user.username
        }
    
    token = create_access_token(data={"sub": user.username, "role": user.role})
    db.add(AuditLog(action="LOGIN_SUCCESS", admin_username=user.username, ip_address=request.client.host))
    db.commit()
    return {"access_token": token, "token_type": "bearer", "role": user.role}

@router.post("/login/mfa", response_model=Token)
def login_mfa(request: Request, data: MfaLoginRequest, db: Session = Depends(get_db)):
    user = db.query(Admin).filter(Admin.username == data.username).first()
    if not user or not getattr(user, 'mfa_enabled', False):
        raise HTTPException(status_code=401, detail="MFA not enabled or user not found")
        
    totp = pyotp.TOTP(user.mfa_secret)
    otp_code_clean = data.otp_code.replace(" ", "").strip()
    if not totp.verify(otp_code_clean, valid_window=2):
        db.add(AuditLog(action="MFA_LOGIN_FAILED", target_id=user.username, ip_address=request.client.host))
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid MFA verification code")
        
    token = create_access_token(data={"sub": user.username, "role": user.role})
    db.add(AuditLog(action="LOGIN_SUCCESS", admin_username=user.username, ip_address=request.client.host))
    db.commit()
    return {"access_token": token, "token_type": "bearer", "role": user.role}

@router.get("/profile")
def get_profile(current_user: Admin = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "role": current_user.role,
        "mfa_enabled": getattr(current_user, 'mfa_enabled', False)
    }

@router.get("/mfa/setup")
def mfa_setup(current_user: Admin = Depends(get_current_user)):
    secret = pyotp.random_base32()
    otpauth_url = pyotp.totp.TOTP(secret).provisioning_uri(
        name=current_user.username,
        issuer_name="CertVerify"
    )
    return {"secret": secret, "otpauth_url": otpauth_url}

@router.post("/mfa/enable")
def mfa_enable(request: Request, data: MfaEnableRequest, db: Session = Depends(get_db), current_user: Admin = Depends(get_current_user)):
    totp = pyotp.TOTP(data.secret)
    otp_code_clean = data.otp_code.replace(" ", "").strip()
    print(f"MFA DEBUG: Secret={data.secret}")
    print(f"MFA DEBUG: Received={otp_code_clean}")
    print(f"MFA DEBUG: Expected={totp.now()}")
    if not totp.verify(otp_code_clean, valid_window=2):
        raise HTTPException(status_code=400, detail="Invalid verification code. Setup failed.")
    
    current_user.mfa_secret = data.secret
    current_user.mfa_enabled = True
    db.add(current_user)
    db.add(AuditLog(action="MFA_ENABLED", admin_username=current_user.username, ip_address=request.client.host))
    db.commit()
    return {"message": "MFA enabled successfully"}

@router.post("/mfa/disable")
def mfa_disable(request: Request, db: Session = Depends(get_db), current_user: Admin = Depends(get_current_user)):
    current_user.mfa_enabled = False
    current_user.mfa_secret = None
    db.add(current_user)
    db.add(AuditLog(action="MFA_DISABLED", admin_username=current_user.username, ip_address=request.client.host))
    db.commit()
    return {"message": "MFA disabled successfully"}
