# SkillBridge AI — Production Deployment Guide

This guide provides complete instructions for deploying the **SkillBridge AI** backend, database, and admin console in a secure online production environment.

---

## 1. Production Architecture Overview

```
                      [ Internet / HTTPS ]
                               |
                   +-----------v-----------+
                   |  Nginx Reverse Proxy  | (SSL Termination: Let's Encrypt)
                   +-----------+-----------+
                               |
             +-----------------+-----------------+
             |                                   |
      (Port 8000)                         (Port 3000 / Static)
+------------v-----------+               +-------v-------+
|  FastAPI Backend App   |               |  Flutter Web  |
|  (4 Uvicorn Workers)   |               | Admin Console |
+------------+-----------+               +---------------+
             |
   +---------+---------+
   |                   |
+--v---------+   +-----v-----+
| MySQL 8.0+ |   | Local/RAG |
| Database   |   | Storage   |
+------------+   +-----------+
```

---

## 2. Prerequisites

- Linux Server (Ubuntu 22.04 LTS recommended, 2 vCPU, 4GB+ RAM)
- Domain Name with DNS A records pointing to server IP (e.g., `api.yourdomain.com`, `admin.yourdomain.com`)
- Docker Engine & Docker Compose (or Python 3.10+ and MySQL 8.0+)
- Registered SSL certificate (Let's Encrypt Certbot)

---

## 3. Online MySQL Configuration

Ensure your MySQL 8.0+ server is configured with:
- **Character Set**: `utf8mb4`
- **Collation**: `utf8mb4_unicode_ci`
- **Connection Isolation**: `READ COMMITTED` or `REPEATABLE READ`

### Dedicated Database & User Provisioning

Run in MySQL console:
```sql
CREATE DATABASE skillbridge_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'skillbridge_user'@'%' IDENTIFIED BY 'STRONG_UNIQUE_PASSWORD_HERE';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, REFERENCES, INDEX, ALTER, LOCK TABLES 
ON skillbridge_prod.* TO 'skillbridge_user'@'%';

FLUSH PRIVILEGES;
```

---

## 4. Environment Variables Setup

1. Copy the production template:
   ```bash
   cp backend/.env.production.example backend/.env
   ```
2. Generate strong secrets using Python:
   ```bash
   python3 -c "import secrets; print(secrets.token_hex(32))"
   ```
3. Edit `backend/.env`:
   - Set `DATABASE_URL=mysql+pymysql://skillbridge_user:<PASSWORD>@<DB_HOST>:3306/skillbridge_prod?charset=utf8mb4`
   - Set `SECRET_KEY=<GENERATED_64_CHAR_HEX>`
   - Set `ENVIRONMENT=production`
   - Set `DEBUG=False`
   - Set `CORS_ORIGINS=["https://admin.yourdomain.com","https://app.yourdomain.com"]`
   - Configure `AI_PROVIDER` (`gemini`, `openai`, `anthropic`, or `none`) and `LLM_API_KEY`

---

## 5. Database Migrations

Apply all schema revisions to the live database:
```bash
cd backend
alembic upgrade head
```

Verify that all tables (`users`, `skills`, `assessments`, `questions`, `careers`, `roadmaps`, `projects`, `documents`, `feedbacks`, `admin_audit_logs`, etc.) are created.

---

## 6. Seed Initial Administrator

Run the secure CLI provisioning tool:
```bash
python -m app.cli.create_admin --email superadmin@yourdomain.com --name "Platform Superadmin"
```
Enter a strong password when prompted.

---

## 7. Run with Docker Compose

Start the containerized stack:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Verify running containers:
```bash
docker compose -f docker-compose.prod.yml ps
```

---

## 8. HTTPS Reverse Proxy via Nginx & Certbot

Create `/etc/nginx/sites-available/skillbridge.conf`:

```nginx
server {
    server_name api.yourdomain.com;

    client_max_body_size 15M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site and acquire SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/skillbridge.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d api.yourdomain.com
```

---

## 9. Health Checks & Uptime Monitoring

Monitor the public health check endpoint:
```bash
curl -I https://api.yourdomain.com/api/v1/health
```
Expected response:
```json
{
  "status": "healthy",
  "project_name": "SkillBridge AI",
  "database_connected": true,
  "environment": "production"
}
```

---

## 10. Database Backup & Restore Runbook

### Automatic Daily Backup via Cron (Linux)
Add to `crontab -e`:
```bash
0 3 * * * mysqldump -u skillbridge_user -p'PASSWORD' skillbridge_prod | gzip > /var/backups/skillbridge_$(date +\%F).sql.gz
```

### Windows PowerShell Backup Script
```powershell
.\database\backup_mysql.ps1 -DbHost "127.0.0.1" -DbUser "skillbridge_user" -DbName "skillbridge_prod"
```

### Database Restoration
```powershell
.\database\restore_mysql.ps1 -BackupFile ".\database\backups\skillbridge_prod_20261024.sql"
```

---

## 11. Security Checklist

- [x] Passwords hashed with bcrypt (`passlib[bcrypt]`).
- [x] JWT tokens signed with HS256 and configured with 60-minute expiration.
- [x] Role-Based Access Control verified server-side on every request via `get_current_admin`.
- [x] SQL injection prevented using SQLAlchemy ORM parameterized queries.
- [x] Strict CORS allowlist prohibiting wildcards (`*`).
- [x] Rate limiting active (60 requests/minute default, 100 daily LLM queries/user).
- [x] Input validation enforced through Pydantic v2 models.
- [x] Non-root Docker user container execution.
- [x] Document upload restricted by MIME type (`.pdf`, `.txt`) and 10MB size limit.
- [x] Immutable compliance audit logs recorded for all administrative actions.
