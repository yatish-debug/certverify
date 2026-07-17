# CertVerify: Enterprise Digital Credential Verification

CertVerify is a flagship cybersecurity portfolio project designed for secure, tamper-proof issuance and verification of digital certificates. Built with modern web technologies, it features Bank-Grade security mechanisms, interactive analytics, bulk operations, and a beautiful premium user experience.

## Flagship Features

### 🛡️ Enterprise Security
- **Cryptographic Integrity (SHA-256)**: Every uploaded certificate is hashed. The engine verifies the file on disk against the hash in the database during verification to guarantee zero tampering.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions (SUPERADMIN vs ADMIN).
- **JWT & Refresh Tokens**: Secure, short-lived access tokens combined with long-lived refresh tokens.
- **Comprehensive Audit Trails**: Every sensitive action (Login, Create, Delete, Verify) is logged with the client's IP address and a timestamp.
- **API Rate Limiting**: Brute-force protection on endpoints via `slowapi`.
- **Secure HTTP Headers**: CSP, HSTS, and X-Frame-Options injected via the `secure` library.
- **Auto-Logout**: Inactivity timeouts automatically clear JWT sessions.

### 💼 Admin Capabilities
- **Bulk Operations**: Upload a CSV file to instantly generate and issue hundreds of certificates at once.
- **Database Backup & Restore**: One-click endpoints to trigger `.sql` dumps of the database.
- **Interactive Analytics**: Beautiful Recharts-powered dashboard showing Certificate Distribution, Failed Verifications, and Upload Trends.

### 🌟 Premium User Experience
- **Framer Motion Animations**: Smooth page transitions and micro-interactions.
- **Dark/Light Mode**: Full theme support with Tailwind CSS.
- **QR Code Verification**: Instant generation of QR codes that link directly back to a certificate's verification page.
- **Printable Certificates**: Dedicated CSS `@media print` stylesheets and PDF export via `jsPDF`.

## Tech Stack

- **Frontend**: React (Vite), Tailwind CSS v3, Framer Motion, Recharts, React-Hook-Form
- **Backend**: FastAPI (Python), SQLAlchemy, PostgreSQL, Alembic
- **Infrastructure**: Docker, Docker Compose

## Quick Start (Local Setup)

Ensure you have PostgreSQL installed and running on your machine.

1. **Clone the repository.**
2. **Database Setup:**
   Create a PostgreSQL database and user:
   ```sql
   CREATE DATABASE certverify;
   CREATE USER certverify WITH PASSWORD 'securepassword';
   GRANT ALL PRIVILEGES ON DATABASE certverify TO certverify;
   ```
3. **Backend Setup:**
   ```bash
   cd backend
   python -m venv venv
   # Activate venv: `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac/Linux)
   pip install -r requirements.txt
   
   # Set the database URL if it differs from the default
   # export DATABASE_URL="postgresql://certverify:securepassword@localhost:5432/certverify"
   
   uvicorn main:app --reload
   ```
4. **Frontend Setup:**
   Open a new terminal:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
5. Access the application:
   - **Public Portal**: [http://localhost:5173](http://localhost:5173)
   - **Admin Portal**: [http://localhost:5173/admin/login](http://localhost:5173/admin/login)
   - **API Documentation (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Default Admin Credentials
- **Username**: `admin`
- **Password**: `admin123`

## Documentation
Additional architectural documentation can be found in the `docs/` folder:
- [ER Diagram](docs/ER_Diagram.md)
- [Deployment Guide](docs/Deployment.md)
- [Security Architecture](docs/Architecture.md)

## Future Updates

### 🔑 External Configuration Needed (You'll need to provide these)

- **Automated SMTP Email Issuance**:
  **What you need to provide:** SMTP mail server details to send emails (e.g., host, port, username, password). You can use a development credentials provider (like Mailtrap) or standard Gmail App Passwords.
- **Database Cloud Backups (AWS S3)**:
  **What you need to provide:** Your AWS credentials (S3 Bucket Name, AWS Access Key ID, and Secret Access Key) so the backup script can upload files securely to your cloud.
