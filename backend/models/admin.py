from sqlalchemy import Column, Integer, String, Boolean
from core.database import Base
class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="ADMIN")
    mfa_secret = Column(String, nullable=True)
    mfa_enabled = Column(Boolean, default=False)
