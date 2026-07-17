from fastapi import FastAPI, Response
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

def run_migrations():
    import sqlite3
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'certverify.db')
    if not os.path.exists(db_path):
        return
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Update admins table
    try:
        cursor.execute("PRAGMA table_info(admins)")
        admin_cols = [col[1] for col in cursor.fetchall()]
        if 'mfa_secret' not in admin_cols:
            cursor.execute("ALTER TABLE admins ADD COLUMN mfa_secret TEXT")
        if 'mfa_enabled' not in admin_cols:
            cursor.execute("ALTER TABLE admins ADD COLUMN mfa_enabled BOOLEAN DEFAULT 0")
    except Exception as e:
        print("Migration error on admins table:", e)
        
    # 2. Update certificates table
    try:
        cursor.execute("PRAGMA table_info(certificates)")
        cert_cols = [col[1] for col in cursor.fetchall()]
        if 'qr_fg_color' not in cert_cols:
            cursor.execute("ALTER TABLE certificates ADD COLUMN qr_fg_color TEXT DEFAULT '#0F172A'")
        if 'qr_bg_color' not in cert_cols:
            cursor.execute("ALTER TABLE certificates ADD COLUMN qr_bg_color TEXT DEFAULT '#FFFFFF'")
    except Exception as e:
        print("Migration error on certificates table:", e)
        
    # 3. Update audit_logs table
    try:
        cursor.execute("PRAGMA table_info(audit_logs)")
        log_cols = [col[1] for col in cursor.fetchall()]
        if 'log_hash' not in log_cols:
            cursor.execute("ALTER TABLE audit_logs ADD COLUMN log_hash TEXT")
        if 'prev_hash' not in log_cols:
            cursor.execute("ALTER TABLE audit_logs ADD COLUMN prev_hash TEXT")
    except Exception as e:
        print("Migration error on audit_logs table:", e)
        
    conn.commit()
    conn.close()

run_migrations()

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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
