# SkillBridge AI 🚀

> **Adaptive AI Learning Platform for Students, Job Seekers, and Lifelong Learners.**

SkillBridge AI is a full-stack, enterprise-grade educational technology platform engineered to bridge skill gaps through dynamic, personalized learning paths. The platform combines deterministic pedagogical rules, Bayesian mastery tracking, and retrieval-augmented reasoning (RAG) to continuously assess competency, navigate curriculum dependency graphs, and calibrate learning activities.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend API** | Node.js 18+, Express, JWT Auth (HS256), Bcrypt (12 rounds), CORS, Helmet |
| **Database & ODM** | MongoDB, Mongoose 8.x (with zero-dependency in-memory MongoMemoryServer dev fallback) |
| **Web Frontend** | React 18+, Vite, Vanilla CSS Design System, Dark Mode & Glassmorphism |
| **Learner Mobile App** | Flutter 3.47+ / Dart 3.13+, Material Design 3, Android APK & Web |
| **Admin Web Console** | Flutter Web / React Admin Console, Material Design 3 |
| **AI, RAG & Sandbox** | Multi-provider LLM adapter (Gemini, OpenAI, Deterministic Fallback), TF-IDF RAG, AST + Node VM sandbox |
| **Preserved Reference** | Python 3.10+, FastAPI, SQLAlchemy 2.0, Alembic, SQLite/MySQL |

---

## 📁 Repository Structure

```text
nagmamobileApp/
├── .env.example              # Development environment template
├── MIGRATION_PLAN.md         # Comprehensive architectural migration strategy
├── FEATURE_PARITY.md         # 100% Feature-by-feature verification checklist
├── API_MIGRATION_MAP.md      # Exact endpoint contract mapping & schemas
├── docs/
│   └── NOTIFICATION_FEATURE_AUDIT.md # Complete notification system audit & setup guide
├── backend-node/             # Target Node.js + Express + Mongoose Backend
│   ├── src/
│   │   ├── config/           # Centralized configuration & DB connector
│   │   ├── models/           # Mongoose schemas (Auto-increment integer ID support)
│   │   ├── middleware/       # JWT auth, RBAC guard, rate-limiting, error handler
│   │   ├── services/         # Adaptive mastery, RAG, AST coding sandbox, AI adapter
│   │   ├── controllers/      # API controller endpoints
│   │   └── routes/           # Versioned API routes (/api/v1)
│   ├── scripts/              # Safe SQL-to-Mongo migration & MongoDB seed scripts
│   └── tests/                # Jest integration test suite (24/24 passing)
├── frontend/                 # React 18+ Vite Web SPA (Learner & Admin console)
│   ├── src/
│   │   ├── components/       # Glassmorphic UI components, Navbar, Footer, StatusBadge
│   │   ├── context/          # Auth context with session restoration
│   │   ├── pages/            # 10 comprehensive learner and admin views
│   │   └── services/         # Typed API client for all subsystems
│   └── dist/                 # Production-optimized Vite bundle
├── mobile_app/               # Flutter Android mobile client (12/12 tests passing)
│   ├── lib/                  # Clean architecture (core, features, shared)
│   └── test/                 # Automated Flutter unit & widget tests
├── admin_dashboard/          # Flutter Web admin console (7/7 tests passing)
│   ├── lib/                  # Admin layout, analytics, feedback, taxonomy
│   └── test/                 # Automated Flutter Web widget tests
├── backend/                  # Preserved Python FastAPI Backend (73/73 tests passing)
│   ├── app/                  # FastAPI routers, models, schemas, services
│   ├── skillbridge_dev.db    # Preserved SQLite database
│   └── tests/                # Pytest suite
└── database/                 # Schema definitions, seed scripts, SQL migrations
```

---

## ⚡ Quickstart Guide (Windows PowerShell)

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Flutter SDK**: v3.47.0 or higher
- **Python**: v3.10+ (for preserved backend reference)

---

### 1. Node.js + Express Backend (`backend-node`)

The backend connects to an external MongoDB service if configured in `.env`, or automatically launches an in-memory `MongoMemoryServer` if no external database is active.

```powershell
cd c:\nagmamobileApp\backend-node

# 1. Install dependencies
npm install

# 2. (Optional) Run SQL-to-MongoDB data migration:
# Dry-run validation (no database writes):
node scripts/migrate_sql_to_mongo.js --dry-run
# Live migration:
node scripts/migrate_sql_to_mongo.js

# 3. Seed MongoDB with demo accounts & knowledge docs:
node scripts/seed_mongo.js

# 4. Run automated test suite:
npm test

# 5. Start development server on port 5001:
npm run dev
```

- **Health Check**: [http://localhost:5001/api/v1/health](http://localhost:5001/api/v1/health)
- **API Base**: [http://localhost:5001/api/v1](http://localhost:5001/api/v1)

---

### 2. React Web Application (`frontend`)

```powershell
cd c:\nagmamobileApp\frontend

# 1. Install dependencies
npm install

# 2. Build production bundle (validates zero compilation errors):
npm run build

# 3. Start development server:
npm run dev
```

- **Web App**: [http://localhost:5173](http://localhost:5173)
- **Default Seed Accounts**:
  - **Student Account**: `student@skillbridge.ai` / `Student@123456`
  - **Administrator Account**: `admin@skillbridge.ai` / `Admin@123456`

---

### 3. Flutter Learner Mobile App (`mobile_app`)

Configure the API base URL appropriately for your target testing environment:

#### A. Web Browser Preview (Fastest)
```powershell
cd c:\nagmamobileApp\mobile_app
flutter pub get
flutter run -d chrome --web-port=3001
```

#### B. Android Emulator
```powershell
# Standard Android emulator uses 10.0.2.2 to loopback to host localhost
flutter run -d android
```

#### C. Physical Android Phone via USB / Wi-Fi
```powershell
# Replace 192.168.1.X with your computer's local LAN IP address:
flutter run -d <DEVICE_ID> --dart-define=API_BASE_URL=http://192.168.1.50:5001/api/v1
```

#### D. Build Debug / Release APK
```powershell
flutter build apk --debug
# Generated APK: mobile_app/build/app/outputs/flutter-apk/app-debug.apk
```

---

### 4. Flutter Admin Dashboard (`admin_dashboard`)

```powershell
cd c:\nagmamobileApp\admin_dashboard
flutter pub get
flutter run -d chrome --web-port=8080
```

Or build production web bundle:
```powershell
flutter build web
# Generated assets: admin_dashboard/build/web
```

---

### 5. Preserved Python FastAPI Backend (`backend`)

```powershell
cd c:\nagmamobileApp\backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- **Swagger Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Pytest Suite (73 tests)**: `.\venv\Scripts\pytest -q`

---

## 🧪 Complete Test Suite Verification

Every automated test suite and build command can be run locally:

```powershell
# 1. Node.js Express Backend (24 integration tests)
cd c:\nagmamobileApp\backend-node
npm test

# 2. React Web Application (Vite production bundle build)
cd c:\nagmamobileApp\frontend
npm run build

# 3. Flutter Mobile Learner App (Static analysis + 12 widget/unit tests)
cd c:\nagmamobileApp\mobile_app
flutter analyze
flutter test

# 4. Flutter Admin Dashboard (Static analysis + 7 widget/unit tests + Web build)
cd c:\nagmamobileApp\admin_dashboard
flutter analyze
flutter test
flutter build web

# 5. Legacy Python FastAPI Backend (73 unit & integration tests)
cd c:\nagmamobileApp\backend
.\venv\Scripts\pytest -q
```

---

## 🤖 AI Provider & Fallback Configuration

The platform features a plug-and-play AI adapter architecture in [backend-node/src/services/aiAdapter.js](file:///c:/nagmamobileApp/backend-node/src/services/aiAdapter.js):

- **Deterministic Fallback (Default - Zero Cost)**:
  When `AI_PROVIDER=none` or when API keys are not supplied, the platform runs on its verified rule-based pedagogical Socratic engine. No external network requests are made, ensuring complete offline functionality and zero API billing.
- **Google Gemini Integration**:
  To enable Gemini, set the following in `backend-node/.env`:
  ```ini
  AI_PROVIDER=gemini
  GEMINI_API_KEY=your_gemini_api_key_here
  GEMINI_MODEL=gemini-1.5-flash
  ```
- **OpenAI Integration**:
  To enable OpenAI, set the following in `backend-node/.env`:
  ```ini
  AI_PROVIDER=openai
  OPENAI_API_KEY=your_openai_api_key_here
  OPENAI_MODEL=gpt-4o-mini
  ```
- **RAG Knowledge Pipeline**:
  Upload curriculum documents in PDF, Markdown, or TXT format. Approved documents are automatically chunked with sliding windows and indexed for TF-IDF cosine similarity vector retrieval with source citations.
- **Safe Code Execution Sandbox**:
  Untrusted learner code is checked via static AST security scanning (rejecting `os`, `sys`, `subprocess`, `eval`, `exec`) and executed within isolated Node `vm` sandboxes guarded by a strict 1000ms CPU execution timeout.
