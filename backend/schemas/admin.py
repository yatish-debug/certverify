from pydantic import BaseModel
from typing import Optional
class Token(BaseModel):
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    role: Optional[str] = None
    mfa_required: bool = False
    username: Optional[str] = None
class AdminBase(BaseModel): username: str; role: str
