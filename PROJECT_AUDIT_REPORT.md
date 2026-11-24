# SkillBridge AI — Complete Project Audit Report

**Audit Date:** 2026-11-10 (Updated Post-Repair: 2026-11-11 — see [PROJECT_FIX_REPORT.md](./PROJECT_FIX_REPORT.md))  
**Repository:** `C:\nagmamobileApp`  
**Audited Subsystems:**
- `backend-node/` (Primary Node.js 24 + Express + Mongoose 8.x API)
- `frontend/` (React 18 + Vite Web Application)
- `mobile_app/` (Flutter 3.47 + Dart 3.13 Android/Web Mobile Client)
- `admin_dashboard/` (Flutter 3.47 Web Administrative Console)
- `backend/` (Preserved Legacy Python 3.10 + FastAPI + SQLAlchemy + Alembic Backend)
- `database/` & Root Configuration (`.env.example`, `docker-compose.prod.yml`, `README.md`)

---

## Baseline Execution Snapshot (Pre-Fix)

| Subsystem | Command | Pre-Fix Result | Notes |
| :--- | :--- | :--- | :--- |
| **Node.js Backend (`backend-node`)** | `npm test` | 24/24 Jest tests pass against local MongoDB, **FAIL** in offline/sandboxed `MongoMemoryServer` | **CRITICAL:** Tests execute `deleteMany({})` on `skillbridge_db` (live dev DB) instead of an isolated test DB. |
| **React Web (`frontend`)** | `npm run build` | `vite build` succeeds (1604 modules) | Multiple runtime schema mismatches and missing CSS classes not caught by Vite build. |
| **Flutter Mobile (`mobile_app`)** | `flutter analyze` / `flutter test` | 0 analyzer issues; 25/25 unit/widget tests pass | Unit tests mock HTTP responses, masking multiple field-name mismatches with `backend-node`. |
| **Flutter Admin (`admin_dashboard`)** | `flutter analyze` / `flutter test` / `flutter build web` | 0 analyzer issues; 7/7 tests pass; `build/web` succeeds | `DashboardScreen` displays hardcoded Part 1 metrics; `AnalyticsDashboardScreen` mismatches `backend-node`. |
| **Python Legacy (`backend`)** | `.\venv\Scripts\python.exe -m pytest -q` | 73/73 tests pass (1 Starlette `httpx2` deprecation warning) | Windows `asyncio.ProactorEventLoop` requires loopback socket access during `TestClient`. |

---

## Issues Classified by Severity

### CRITICAL

1. **Flutter Quiz Submission & Grading Schema Mismatch (`mobile_app` ↔ `backend-node`)**
   - **Location:** `mobile_app/lib/features/assessments/screens/assessment_quiz_screen.dart` (`L149`), `assessment_result_screen.dart` (`L17-24, L174-176`), `backend-node/src/services/assessmentService.js` (`L99, L136-144`).
   - **Impact:** Flutter sends `learner_response_json` in quiz submissions, whereas `assessmentService.js` only reads `selected_option`. Every quiz submitted from Flutter grades as `0%`. Additionally, `AssessmentResultScreen` reads `assessment_title`, `total_points_earned`, `total_points_possible`, `adaptive_feedback`, and `question_results`, while `backend-node` returns `title` and `questions_breakdown` (`learner_response`, `correct_answer`), resulting in `0 of 0` points and an empty question breakdown.

2. **React AI Tutor Chat Contract Mismatch (`frontend/src/pages/TutorChatPage.jsx`)**
   - **Location:** `TutorChatPage.jsx` (`L110-115, L173-185, L328-371`).
   - **Impact:** Reads `msg.role`, `msg.content`, `msg.timestamp`, `msg.sources` (`src.title`/`src.filename`), and `tutorStatus.status / provider / model / knowledge_documents_count` (with hardcoded `12`). `backend-node` returns `sender`, `message_text`, `created_at`, `sources_json` (`document_title`), and `{ ai_provider, is_live_llm, model_name, daily_rate_limit }`. Assistant responses fall back to `"I have processed your inquiry."`, user messages render as assistant messages on reload, and citations render raw JSON.

3. **React Admin Console Schema Mismatches & Runtime Crashes (`frontend/src/pages/AdminConsolePage.jsx`)**
   - **Location:** `AdminConsolePage.jsx` (`L23-64, L97, L121-150, L299-320, L379, L495, L532, L716-718, L790-792`), `backend-node/src/controllers/adminController.js` (`L251`).
   - **Impact:**
     - Checks `user.role === 'super_admin'` instead of `'superadmin'`.
     - Reads `data.users`, `data.feedback`, `data.audit_logs` instead of `{ items, total }` — User, Feedback, and Audit tabs always render empty.
     - Role selector uses `'educator'` instead of `'instructor'` (Mongoose `ValidationError` 500).
     - Skill form sends `name` and numeric `difficulty_level: 1..5` instead of `title` and `'beginner'|'intermediate'|'advanced'|'expert'`.
     - Assessment form sends `passing_score_pct`; Question form sends `question_text / options / correct_answer` instead of `prompt / options_json / correct_answer_json`, crashing `adminController.addQuestion` (`prompt.slice(0, 50)` throws `TypeError` 500).
     - Analytics displays hardcoded `'78%'` fallback and missing fields (`total_skills`, `total_documents`).
     - Feedback renders `f.subject`/`f.rating` instead of `f.title`; Audit renders `log.resource_type`/`log.user_id` and hardcoded `'127.0.0.1'` fallback instead of `entity_type`/`admin_id`.
     - `careerForm` and `projectForm` state exists without a rendered tab.

4. **React Feedback Submission Broken (`frontend/src/pages/FeedbackPage.jsx`)**
   - **Location:** `FeedbackPage.jsx` (`L41-46, L100-104, L189`).
   - **Impact:** Sends `subject` instead of `title` (always fails with HTTP 422 from `feedbackController.js`), sends `'content_quality'` and `'ui_ux'` categories absent from `Feedback` Mongoose enum (`ValidationError` 500), and renders blank `item.subject` instead of `item.title`.

5. **React Coding Practice Evaluation Display Mismatch (`frontend/src/pages/CodingPracticePage.jsx`)**
   - **Location:** `CodingPracticePage.jsx` (`L282-320`).
   - **Impact:** Reads `result.score`, `result.ast_check`, string `result.feedback`, and `result.test_results` (`tr.passed`), whereas `backend-node` returns `static_analysis_feedback_json` (object) and `test_results_json` (`tr.is_passed`). Security violations and per-test outcomes do not display correctly.

6. **Flutter Mobile Data Model Mismatches (`mobile_app/lib/features/*`)**
   - **Locations & Impacts:**
     - `adaptive_home_tab.dart` (`L85-87, L137-150, L341-348`) & `activities_screen.dart` (`L91-93, L205, L267-269, L391-395`): Read `target_skill_id`, `target_skill_title`, `reason`, `mastery_score` (weak concepts), `passed_test_cases`, `total_test_cases`, `'all_passed'` instead of `backend-node`'s `target_entity_id`, `title`, `rationale`, `current_mastery`, `tests_passed`, `total_tests`, `'passed'`. Recommended card never renders in `ActivitiesScreen`.
     - `skill_mastery_tab.dart` (`L201-205`): Reads `current_mastery` and `prerequisite_slugs` instead of `mastery_score` and `prerequisites` — every skill renders `0%`.
     - `project_catalog_tab.dart` (`L70-71, L134, L314-318`): Reads `current_completion` and `current_status` instead of `completion_percentage` and `user_status`; passing `'not_started'` into `DropdownButtonFormField` triggers a Flutter assertion crash; unsafe cast on `rubric_json`.
     - `career_exploration_tab.dart` (`L150-159, L352-356, L478-482`): Crashes on empty `_careers` list (`_careers.first`), reads `overall_readiness_percentage`, `top_skill_gaps`, `minimum_mastery_level`, `gap`, and roadmap milestone fields `period`, `focus_area`, `action_items`, `target_skills` instead of `readiness_percentage`, `skill_gaps`, `target_mastery`, `gap_score`, `timeline_days`, `title`, `description`, `target_skill_slug`.
     - `coding_practice_screen.dart` (`L558, L568, L592, L600`): Reads `feedback['error_message']` and `tr['passed']` instead of `feedback['error']` and `tr['is_passed']`.

7. **Coding Sandbox Isolation & Mongoose Enum Crash (`backend-node/src/services/codingService.js` & `models/Coding.js`)**
   - **Location:** `codingService.js` (`L1, L144-184`), `models/Coding.js` (`L55`).
   - **Impact:**
     - `vm.runInContext` executes learner code directly inside the main Express V8 process, ignoring `config.codingSandboxEnabled === false`. Node `vm` is explicitly documented as unsafe for untrusted code.
     - Timeout sets `status = 'time_limit_exceeded'`, which is absent from `CodingSubmission` schema `enum`, throwing `ValidationError` 500 on infinite loops.
     - Hidden test cases (`is_hidden: true`) leak `input` and `expected` values in `test_results_json`.
     - Brace/paren balance check counts delimiters inside string literals and comments.

8. **Jest Suite Mutates Live Development Database (`backend-node/tests/api.test.js` & `src/config/index.js`)**
   - **Location:** `tests/api.test.js` (`L31-40`), `src/config/index.js` (`L26`).
   - **Impact:** Running `npm test` connects to `mongodb://127.0.0.1:27017/skillbridge_db` and executes `deleteMany({})` across collections, wiping out local MongoDB development data. Furthermore, `Counter` and secondary collections are not reset in `beforeAll`.

9. **AI Live Provider Adapter Broken (`backend-node/src/services/aiAdapter.js`)**
   - **Location:** `aiAdapter.js` (`L216, L254`).
   - **Impact:** Executes `await import('node-fetch')`, which is not in `package.json`, throwing `ERR_MODULE_NOT_FOUND` on every Gemini/OpenAI call and silently falling back to deterministic mode even when valid API keys are provided. Lacks request timeout (`AbortSignal.timeout`).

---

### HIGH

1. **React Login/Register Unmounts Form on Error (`frontend/src/context/AuthContext.jsx`, `AuthPages.jsx`)**
   - `AuthContext.login` and `AuthContext.register` set global `loading = true`, causing `App.jsx` to unmount `LoginPage` / `RegisterPage`. On 401/409 errors, the form remounts with `error = null`, hiding authentication errors from the user. `LoginPage` also pre-filled a hardcoded default demo password, and `ForgotPasswordPage` returned a fake success banner on network errors.

2. **React Missing Student Profile Screen & Broken CSS Classes (`frontend/`)**
   - No Student Profile page/tab exists in `Navbar.jsx` or `App.jsx` despite `ApiClient.updateMe`/`updateProfile` being implemented.
   - `App.jsx` `<main>` lacks `className="main-content"`.
   - `TutorChatPage.jsx`, `CodingPracticePage.jsx`, `FeedbackPage.jsx`, and `AdminConsolePage.jsx` use undefined CSS classes (`.glass-panel`, `.input-control`, `.btn-outline`, `.text-gradient`, `.text-muted`, `.badge-accent`, `.status-indicator`, `.spinner`, `.container`) and undefined CSS variables (`--border-color`, `--accent-blue`, `--accent-green`, `--accent-red`, `--text-light`).
   - Mobile navigation hides `.nav-links` under 640px without a mobile menu drawer/toggle.

3. **Flutter Admin Dashboard Hardcoded Data & Analytics Contract Mismatch (`admin_dashboard/`)**
   - `DashboardScreen` shows static hardcoded stats (`1,420`, `148`, `8,950`, `FastAPI + MySQL 9.7`), a placeholder snackbar (`"Taxonomy Editor opens in Part 3."`), and static audit rows.
   - `AnalyticsDashboardScreen` expects nested `user_metrics`, `assessment_metrics`, `skill_metrics`, `career_metrics`, `content_metrics`, `activity_metrics`, `ai_metrics`, which `backend-node` currently returns only as flat top-level fields.
   - `KnowledgeManagementScreen` queries `/rag/documents` (approved only) instead of `/admin/documents` (all docs + approval toggle).
   - `CurriculumScreen` lacks Create/Delete operations for skills, assessments, questions, careers, and projects.

4. **Backend API Parity, Scoring, History & Status Bugs (`backend-node`)**
   - `GET /api/v1/auth/me` is absent from `authRoutes.js` (only `/users/me` existed).
   - `AssessmentService.submitAssessment` computes `totalPoints` from submitted responses rather than all assessment questions and does not deduplicate question IDs.
   - `ChatService.sendMessage` loads `.sort({ id: 1 }).limit(10)` (oldest 10 messages instead of latest 10).
   - `TutorService.getStatus` returns `is_live_llm: true` even if `AI_PROVIDER=gemini`/`openai` lacks an API key or is `'mock'`.
   - `ragController.getDocumentDetail` omits `chunks` expected by `mobile_app`.

5. **Android Production Cleartext Security Weakened (`mobile_app/android/app/src/main/AndroidManifest.xml`)**
   - `android:usesCleartextTraffic="true"` is enabled globally in `main/AndroidManifest.xml` instead of `debug/AndroidManifest.xml`.

6. **Migration Script & Auto-Increment Counter Collisions (`backend-node`)**
   - `migrate_sql_to_mongo.js` checks `!isDryRun` instead of `!activeDryRun` when invoked via `runSqlMigration({ dryRun: true })` and calls `process.exit(1)` inside an exported function.
   - Mongoose models do not advance `Counter` when explicit `id` values are inserted via `.create({ id: ... })`.

---

### MEDIUM

1. **Unescaped RegExp & ReDoS Risks (`backend-node`)**: `SkillService.getAllSkills(category)` (e.g. `?category=C++`) and `AdminController.listUsers(search)` build raw `new RegExp(...)` without escaping regex metacharacters.
2. **Error Handling & ID Parsing (`backend-node`)**: `errorHandler.js` does not map Mongoose `ValidationError` (400/422), `CastError` (400), or Mongo duplicate key `11000` (409). Several controllers pass `parseInt(req.params.id, 10)` without checking `Number.isNaN`.
3. **Production CORS Bypass (`backend-node/src/app.js`)**: CORS origin callback returns `callback(null, true)` unconditionally even in production mode with `credentials: true`.
4. **Input Validation Gaps (`backend-node`)**: `authController.register` does not validate email syntax or 8-char minimum password length; `careerService.generateRoadmap` lacks `targetScore === 0` guard and `plan_type` validation; `adminController` lacks field validation on `createSkill`, `createAssessment`, `addQuestion`, `updateUserRole`, `updateUserStatus`, `updateFeedbackStatus`.
5. **UI Edge Cases (`frontend/src/pages/AssessmentsPage.jsx`)**: Division by zero when `totalQ === 0`; displays `asm.question_count || 5` instead of `asm.question_count ?? 0`.
6. **Database Connection Return Consistency & Config (`backend-node/src/config/database.js`, `scripts/verify_e2e.js`)**: `connectDB()` inconsistently returns `Connection` vs `Mongoose`; `verify_e2e.js` prints `config.nodeEnv` (`undefined`) instead of `config.environment`.
7. **RAG Chunking & PDF Extraction (`backend-node/src/services/ragService.js`)**: `chunkText` lacks `step >= 1` guard if `overlap >= chunkSize`; PDF text fallback leaves raw PostScript commands.
8. **Root `.env.example`**: Outdated for Python/FastAPI only (Port 8000, MySQL/SQLite); missing Node.js + MongoDB + AI/Sandbox env template documentation.

---

### LOW

1. **React Auto-Refresh Interceptor & Effect Hook Deps (`frontend/`)**: `ApiClient.request` does not try `refreshToken()` before emitting `auth_unauthorized` on 401; minor missing hook dependency arrays in `App.jsx`, `AdminConsolePage.jsx`, `CodingPracticePage.jsx`.
2. **Flutter Web Base URL & Physical Device Guidance (`mobile_app/lib/core/config/app_config.dart`)**: `AppConfig.apiBaseUrl` defaults to `http://10.0.2.2:5000/api/v1` even when `kIsWeb` is true, and lacks runtime custom server URL input in `SettingsScreen` for physical Android devices on LAN IPv4.
3. **Python Backend Deprecation Warning (`backend/`)**: `starlette 1.7.0` emits `StarletteDeprecationWarning` for `httpx` vs `httpx2`.

