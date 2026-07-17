from sqlalchemy.orm import Session
from models.certificate import Certificate
def get_certificate_by_id(db: Session, cert_id: str): return db.query(Certificate).filter(Certificate.cert_id == cert_id).first()
