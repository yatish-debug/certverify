from sqlalchemy import Column, Integer, String, DateTime, event, select
from core.database import Base
from datetime import datetime
import hashlib

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String)
    admin_username = Column(String, nullable=True)
    target_id = Column(String, nullable=True)
    ip_address = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    details = Column(String, nullable=True)
    log_hash = Column(String, nullable=True)
    prev_hash = Column(String, nullable=True)

@event.listens_for(AuditLog, 'before_insert')
def before_insert_audit_log(mapper, connection, target):
    # Query latest audit log entry to get its hash
    stmt = select(AuditLog.log_hash).order_by(AuditLog.id.desc()).limit(1)
    result = connection.execute(stmt).fetchone()
    
    if result and result[0]:
        target.prev_hash = result[0]
    else:
        target.prev_hash = "0" * 64
        
    action = target.action or ""
    admin = target.admin_username or ""
    target_id = target.target_id or ""
    ip = target.ip_address or ""
    details = target.details or ""
    
    # Standardize data format for hashing
    data_str = f"{target.prev_hash}|{action}|{admin}|{target_id}|{ip}|{details}"
    target.log_hash = hashlib.sha256(data_str.encode('utf-8')).hexdigest()
