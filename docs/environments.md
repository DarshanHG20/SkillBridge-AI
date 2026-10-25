# SkillBridge AI - Environment Configuration Guide ⚙️

This document details the configuration, network topology, and zero-cost hosting guidelines for development, staging, and production environments.

---

## 1. Environment Comparison Matrix

| Configuration Key | Development (Local) | Staging / CI | Production (Zero-Cost / Free-Tier) |
| :--- | :--- | :--- | :--- |
| **`ENVIRONMENT`** | `development` | `staging` | `production` |
| **`DEBUG`** | `true` | `false` | `false` |
| **`HOST`** | `0.0.0.0` or `127.0.0.1` | `0.0.0.0` | `0.0.0.0` |
| **`PORT`** | `8000` | `8000` | Process assigned (e.g. `$PORT` / `443`) |
| **`DATABASE_URL`** | `mysql+pymysql://...` or `sqlite:///./dev.db` | `sqlite:///./test.db` | `mysql+pymysql://...` (Cloud MySQL) |
| **`DB_POOL_SIZE`** | 5 | 2 | 5 - 10 |
| **`DB_ECHO`** | `false` (or `true` when debugging) | `false` | `false` |
| **`CORS_ORIGINS`** | `["http://localhost:*", "http://10.0.2.2:*"]` | `["https://staging.yourdomain.com"]` | `["https://admin.yourdomain.com"]` |
| **Mobile API Host** | `http://10.0.2.2:8000` (Emulator) / LAN IP | `https://api-staging.yourdomain.com` | `https://api.yourdomain.com` |

---

## 2. Local Development Environment

### Workstation Prerequisites
- **Operating System**: Windows 10/11, macOS, or Linux.
- **Python**: Version 3.10.x or higher with `pip` and `venv`.
- **Flutter SDK**: Version 3.47.0+ (Dart 3.13.0+).
- **Database Engine**:
  - Primary: MySQL Server 8.0/9.7 Community Edition running locally on port 3306.
  - Zero-Setup Alternative: SQLite database (`sqlite:///./skillbridge_dev.db`) supported natively by SQLAlchemy without running any background database daemon.

### Port & Network Allocation
- **8000**: FastAPI Backend API ([http://localhost:8000](http://localhost:8000))
- **3000**: Flutter Web Admin Dashboard ([http://localhost:3000](http://localhost:3000))
- **3306**: MySQL Community Edition service
- **Android Emulator Loopback**: Android emulators use `http://10.0.2.2:8000` to refer to the host machine's `localhost`.
- **Physical Android Phone on LAN**: Connect your phone to the same Wi-Fi network and point `AppConfig.apiBaseUrl` to your workstation's LAN IP (e.g., `http://192.168.1.50:8000`).

---

## 3. Remote Connectivity & Android Release APK

The mobile application is compiled and distributed directly as a release APK (`.apk` file) rather than requiring immediate Google Play Store publication. 

To enable remote learners on mobile data or remote Wi-Fi networks to connect:
1. **Public HTTPS Endpoint**: The backend MUST be reachable over a valid HTTPS URL with a valid TLS certificate. Android 9+ (API 28+) blocks non-HTTPS cleartext traffic by default.
2. **Zero-Cost Tunneling for Development Testing**:
   - **Cloudflare Tunnel (`cloudflared`)**: Completely free, provides instant HTTPS URLs (e.g., `https://skillbridge-api.trycloudflare.com`) pointing to your local `http://localhost:8000` without opening router ports.
   - **ngrok / Localtunnel**: Free tier provides quick HTTPS endpoints for testing mobile APK builds remotely.
3. **Flutter Compile-time Environment Injection**:
   Build the APK by passing the backend URL dynamically without modifying source code:
   ```bash
   cd mobile_app
   flutter build apk --release --dart-define=API_BASE_URL=https://api.yourdomain.com/api/v1
   ```

---

## 4. Zero-Cost Production Hosting Strategy

To satisfy the zero-cost priority, the following battle-tested free tiers are recommended:

### A. Backend Compute (FastAPI)
1. **Render.com Free Web Service**:
   - 512 MB RAM, free SSL/TLS, auto-deploy from GitHub.
   - *Note on Free Tier Limits*: Spins down after 15 minutes of inactivity; first request takes ~30-50s to wake up.
2. **Fly.io / Koyeb Free Tier**:
   - Free nano container instances with persistent global routing.
3. **Oracle Cloud Infrastructure (OCI) Always Free Tier (Best Free Solution)**:
   - Provides up to 4 Ampere ARM cores and 24 GB RAM free forever.
   - Can easily host MySQL, FastAPI, Caddy/Nginx, and background workers with enterprise performance at $0.00.

### B. Relational Database (MySQL)
1. **AlwaysData**: Free 100 MB MySQL database, full phpMyAdmin/direct port access.
2. **FreeSQLDatabase.com**: Free 5 MB starter DB for testing schemas.
3. **OCI Always Free Instance**: Self-host MySQL 8.4/9.7 on an Ubuntu VM with regular automated backup scripts.

### C. Admin Dashboard (Flutter Web)
1. **Cloudflare Pages / GitHub Pages / Vercel**:
   - 100% Free forever.
   - Unlimited bandwidth and free SSL certificates.
   - Deploy by running `flutter build web --release` and pushing the `build/web/` directory.

---

## 5. Security & Production Checklist

Prior to deploying to production or sharing release APKs:
- [ ] Set `DEBUG=false` in the backend environment.
- [ ] Generate a cryptographically strong `SECRET_KEY` via `openssl rand -hex 32`.
- [ ] Ensure all API calls use `https://` URLs.
- [ ] Whitelist only authorized production web domains in `CORS_ORIGINS`.
- [ ] Run Alembic migrations to align database schema (`alembic upgrade head`).
- [ ] Ensure database credentials are passed exclusively via system environment variables.
