# Deployment Guide

This guide outlines how to deploy CertVerify to a production environment (e.g., AWS EC2, DigitalOcean Droplet, Linux Server).

## Prerequisites
- A Linux server (Ubuntu 20.04/22.04 recommended)
- Domain name mapped to the server's IP address
- Docker & Docker Compose installed

## 1. Environment Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-org/certverify.git
   cd certverify
   ```

2. **Configure Environment Variables**
   Create a `.env` file in the `backend/` directory:
   ```env
   SECRET_KEY=your_very_long_secure_random_string
   DATABASE_URL=postgresql://user:password@db:5432/certverify
   ```

3. **Update CORS**
   In `backend/main.py`, update the `allow_origins` array in the `CORSMiddleware` to include your production domain (e.g., `https://verify.yourcompany.com`).

4. **Update Frontend API URL**
   In `frontend/.env` (create if it doesn't exist):
   ```env
   VITE_API_URL=https://api.verify.yourcompany.com
   ```

## 2. Reverse Proxy (Nginx) & SSL

It is highly recommended to place an Nginx reverse proxy in front of the Docker containers to handle SSL termination.

1. **Install Nginx & Certbot**
   ```bash
   sudo apt update
   sudo apt install nginx certbot python3-certbot-nginx
   ```

2. **Nginx Configuration**
   Create `/etc/nginx/sites-available/certverify`:
   ```nginx
   server {
       server_name verify.yourcompany.com;

       location / {
           proxy_pass http://localhost:5173;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       location /api/ {
           proxy_pass http://localhost:8000/api/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```
   Enable it:
   ```bash
   sudo ln -s /etc/nginx/sites-available/certverify /etc/nginx/sites-enabled/
   sudo systemctl reload nginx
   ```

3. **Obtain SSL Certificate**
   ```bash
   sudo certbot --nginx -d verify.yourcompany.com
   ```

## 3. Run Application

Start the docker containers in detached mode:
```bash
docker-compose up -d --build
```

## 4. Initial Setup
The application automatically provisions a `SUPERADMIN` user on first boot if one does not exist:
- **Username**: admin
- **Password**: admin123

> [!CAUTION]
> Immediately log in and change this password, or run a python script inside the backend container to update the database directly.
## Alternative: PythonAnywhere Deployment

If you want to host the backend API on PythonAnywhere, follow these steps. PythonAnywhere is great for Python-based backends and provides an easy WSGI interface.

### 1. Upload Source Code
1. Log in to your PythonAnywhere account.
2. Go to the **Files** tab and upload your `backend` folder, for example to `/home/yourusername/CertVerify/backend`.
   *Alternatively, you can open a Bash console in PythonAnywhere and clone your git repository.*

### 2. Set Up Virtual Environment
1. Go to the **Consoles** tab and start a new **Bash** console.
2. Create a virtual environment and install the requirements:
   ```bash
   mkvirtualenv --python=python3.10 my-venv  # Choose your python version
   workon my-venv
   cd ~/CertVerify/backend
   pip install -r requirements.txt
   ```

### 3. Configure the Web App
1. Go to the **Web** tab and click **Add a new web app**.
2. When asked for the Python web framework, choose **Manual configuration** (this is crucial for FastAPI).
3. Select the same Python version you used for the virtual environment.
4. **Virtualenv section**: Enter the path to your virtual environment (e.g., `/home/yourusername/.virtualenvs/my-venv`).
5. **Source code section**: Enter the path to your backend directory (e.g., `/home/yourusername/CertVerify/backend`).

### 4. Configure WSGI File
1. Still on the **Web** tab, click the link to your **WSGI configuration file** (it will look something like `/var/www/yourusername_pythonanywhere_com_wsgi.py`).
2. Delete everything in the file and replace it with:

   ```python
   import sys
   import os

   # Add your project directory to the sys.path
   project_home = '/home/yourusername/CertVerify/backend'
   if project_home not in sys.path:
       sys.path.append(project_home)

   # Import the application from the wsgi.py file we created
   from wsgi import application
   ```
3. Save the file.

### 5. Static Files (For Uploads)
Since the app allows serving uploaded files, you should configure PythonAnywhere to serve them directly (it's much faster than letting FastAPI do it).
1. Go to the **Static files** section on the **Web** tab.
2. Add a new entry:
   - **URL**: `/uploads/`
   - **Directory**: `/home/yourusername/CertVerify/backend/uploads`

### 6. Reload and Test
1. Go to the top of the **Web** tab and click the large green **Reload** button.
2. Visit your PythonAnywhere URL (e.g., `https://yourusername.pythonanywhere.com/docs`) to test the FastAPI Swagger documentation.
