from fastapi import APIRouter
from . import auth, certificates, bulk, verify, system, audit

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(certificates.router, prefix="/certificates", tags=["certificates"])
api_router.include_router(bulk.router, prefix="/bulk", tags=["bulk"])
api_router.include_router(verify.router, prefix="/verify", tags=["verify"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
