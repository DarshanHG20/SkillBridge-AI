# SkillBridge AI 🚀

> **Adaptive AI Learning Platform for Students, Job Seekers, and Lifelong Learners.**

SkillBridge AI is a full-stack, enterprise-grade educational technology platform engineered to bridge skill gaps through dynamic, personalized learning paths. Unlike static curriculum platforms, SkillBridge AI features a **hybrid adaptive AI engine** (combining deterministic rules, machine learning mastery modeling, and retrieval-augmented reasoning) to continuously assess student competency, diagnose knowledge gaps, navigate skill dependency graphs, and calibrate learning activities to each learner's unique pace and goals.

---

## 🌟 Core Platform Features

- **Dynamic Skill Mastery Graph**: Models prerequisites, dependencies, and mastery thresholds as a directed acyclic graph (DAG) across Python, Java, SQL, DSA, Web Dev, Data Science, AI/ML, Networking, and Cybersecurity.
- **Adaptive Diagnostic Assessment Engine**: Server-side scoring evaluating question attempts with exponential moving average (EMA) mastery updates, diagnosing root misconceptions rather than binary right/wrong scoring.
- **Career Intelligence & Dynamic Roadmaps**: Target career pathway gap analysis with automated generation of 30, 60, and 90-day learning roadmaps.
- **Project-Based Learning**: Hands-on project templates with rubrics, milestone checklists, and portfolio progress tracking.
- **Provider-Independent AI Tutor**: Plug-and-play LLM adapter supporting Gemini, OpenAI, Claude, or a zero-cost deterministic fallback with per-user daily rate limits.
- **RAG Educational Document Pipeline**: Safe PDF/text ingestion, sliding-window chunking, TF-IDF vector retrieval, and prompt injection defense.
- **Safe Coding Sandbox**: Sandboxed code execution supporting Python, JavaScript, and Java with time limit and resource guards.
- **Admin Management Console (Flutter Web)**: Comprehensive management of user accounts, role elevation, skill taxonomies, assessment banks, career pathways, project templates, RAG document approval, student feedback review, verified learning analytics, and CSV report export.
- **Learner Mobile App (Flutter Android)**: Native-performance Android app with Material Design 3, adaptive dashboards, quiz engine, AI tutor chat, and direct APK sideloading distribution.

---

## 📁 Repository Structure

```text
nagmamobileApp/
├── .env.example              # Development environment template
├── .gitignore                # Centralized Git ignore rules
├── docker-compose.prod.yml   # Production Docker Compose orchestration
├── README.md                 # Complete system guide & checklist
├── docs/                     # Architectural & operational guides
│   ├── architecture.md       # High-level architecture & diagrams
│   ├── database_design.md    # Normalized schema specification (20+ tables)
│   ├── environments.md       # Dev, Staging, and Production environment guide
│   ├── PRODUCTION_DEPLOYMENT.md # Online backend & MySQL deployment runbook
│   └── ANDROID_APK_DISTRIBUTION.md # Direct release APK build & sideloading
├── backend/                  # Python FastAPI Backend service
│   ├── Dockerfile            # Multi-stage production container
│   ├── .env.production.example # Production environment template
│   ├── alembic.ini           # Database migration configuration
│   ├── requirements.txt      # Python dependencies
│   ├── pyproject.toml        # Backend project metadata & tools
│   ├── app/
│   │   ├── main.py           # FastAPI entrypoint, middleware, lifespan
│   │   ├── core/             # Settings, DB session, security, password hashing
│   │   ├── api/v1/           # Versioned API router & endpoints (/api/v1)
│   │   ├── models/           # SQLAlchemy 2.0 DeclarativeBase ORM models
│   │   ├── schemas/          # Pydantic v2 request/response schemas
│   │   ├── adaptive/         # Exponential moving average mastery engine
│   │   ├── tutor/            # Multi-provider LLM adapter & deterministic fallback
│   │   ├── rag/              # Document extraction, chunking, and TF-IDF search
│   │   ├── coding/           # Safe multi-language coding practice engine
│   │   ├── services/         # Verified analytics & CSV generation services
│   │   └── cli/              # Admin provisioning CLI scripts
│   ├── migrations/           # Alembic schema version revisions
│   └── tests/                # 73 automated Pytest unit and integration tests
├── mobile_app/               # Flutter Android mobile client
│   ├── pubspec.yaml          # Flutter dependencies and assets
│   ├── lib/                  # Clean architecture (core, features, shared)
│   └── test/                 # 12 automated Flutter widget & unit tests
├── admin_dashboard/          # Flutter Web admin management console
│   ├── pubspec.yaml          # Flutter Web dependencies
│   ├── lib/                  # Admin layout, analytics, feedback, taxonomy
│   └── test/                 # 7 automated Flutter Web widget tests
└── database/                 # Schema definitions, seed scripts, SQL migrations
    ├── backup_mysql.ps1      # PowerShell automated database backup script
    └── restore_mysql.ps1     # PowerShell automated database restore script
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Mobile App (Android)** | Flutter 3.47+ / Dart 3.13+, Material Design 3, Direct APK Distribution |
| **Admin Dashboard (Web)** | Flutter Web, Material Design 3, Responsive Desktop Layout |
| **Backend API** | Python 3.10+, FastAPI, Uvicorn (ASGI) |
| **Data Validation** | Pydantic v2 & Pydantic-Settings |
| **Database & ORM** | MySQL 8.0+ / SQLite (local dev), SQLAlchemy 2.0, Alembic |
| **AI, RAG & Sandbox** | Scikit-learn (TF-IDF vector indexing), PyPDF, Multi-provider LLM adapter |
| **Testing** | Pytest (73 tests), HTTPX TestClient, Flutter Test (19 tests) |

---

## ⚡ Quickstart Guide (Local Development)

### 1. Backend Setup (Windows PowerShell)

```powershell
# Navigate to backend directory
cd c:\nagmamobileApp\backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Provision initial administrator account
python -m app.cli.create_admin --email admin@skillbridge.ai --password "<YOUR_ADMIN_PASSWORD>" --name "Lead Administrator"

# Start the FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- **Interactive API Documentation (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

---

### 2. Admin Web Console Setup (Flutter Web)

```powershell
# In a new PowerShell window:
cd c:\nagmamobileApp\admin_dashboard
flutter pub get
flutter run -d chrome --web-port=3000
```
**Admin Login:** Use the administrator credentials configured for your local development environment. Never commit real passwords or API keys to GitHub.

---

### 3. Student Mobile App Setup (Flutter Android)

```powershell
# In a new PowerShell window:
cd c:\nagmamobileApp\mobile_app
flutter pub get
# Run in Chrome for fast local preview:
flutter run -d chrome --web-port=3001
# Or run on connected Android phone / emulator:
flutter run -d android
```

---

## 🧪 Automated Testing Suite

All tests can be executed locally without external dependencies:

```powershell
# 1. Backend Pytest Suite (73 tests)
cd c:\nagmamobileApp\backend
.\venv\Scripts\pytest -v

# 2. Admin Dashboard Flutter Tests (7 tests) & Static Analysis
cd c:\nagmamobileApp\admin_dashboard
flutter analyze
flutter test

# 3. Mobile App Flutter Tests (12 tests) & Static Analysis
cd c:\nagmamobileApp\mobile_app
flutter analyze
flutter test
```

---

## 📦 Android Release APK Build & Direct Distribution

Build the production signed APK without Google Play Store requirements:

```powershell
cd c:\nagmamobileApp\mobile_app
flutter build apk --release --dart-define=API_BASE_URL=https://api.yourdomain.com/api/v1
```

- **Generated APK**: `mobile_app/build/app/outputs/flutter-apk/app-release.apk`
- **Sideload to Test Phone via USB**:
  ```powershell
  adb install -r build\app\outputs\flutter-apk\app-release.apk
  ```
- Detailed signing, keystore protection, and trusted hosting instructions: [docs/ANDROID_APK_DISTRIBUTION.md](file:///c:/nagmamobileApp/docs/ANDROID_APK_DISTRIBUTION.md).

---

## 🌐 Production Deployment Guide

Deploy using Docker Compose or standalone Linux services:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
Comprehensive production guides covering Nginx reverse proxy, Let's Encrypt SSL, managed MySQL configuration, backup cron jobs, and rate limit adjustments: [docs/PRODUCTION_DEPLOYMENT.md](file:///c:/nagmamobileApp/docs/PRODUCTION_DEPLOYMENT.md).

---

## 📱 Real Android Device Manual Testing Checklist

| # | Step | Verification Action | Expected Result |
| :--- | :--- | :--- | :--- |
| 1 | **Installation** | Sideload `app-release.apk` onto Android phone | App installs cleanly; opens with Splash screen |
| 2 | **Registration** | Register a new learner account | Account created; JWT tokens stored securely |
| 3 | **Diagnostics** | Go to Settings -> Network Connectivity | Green "Connection OK" health status displayed |
| 4 | **Adaptive Assessment** | Launch Diagnostic Quiz and submit answers | Server scores quiz; mastery score updates; explanations shown |
| 5 | **Roadmap Generation** | Select a target career (e.g. Backend Engineer) | 30/60/90-day personalized milestone roadmap generated |
| 6 | **AI Tutor / Chat** | Send question to AI Tutor (e.g. "What is recursion?") | Contextual answer or deterministic fallback response returned |
| 7 | **Knowledge Search** | Query RAG Knowledge base | Citations and evidence snippets returned with confidence score |
| 8 | **Coding Sandbox** | Submit Python function solution | Evaluated against test cases; feedback returned |
| 9 | **Feedback Submission** | In Settings -> Submit Bug Report | Feedback saved to database with `pending` status |
| 10 | **Admin Verification** | Open Admin Web console (`/feedback`) | Submitted bug report appears; admin can review and mark `resolved` |
| 11 | **Export CSV** | In Admin Web console (`/analytics`) | Download Users, Attempts, and Audit Logs CSV files |
