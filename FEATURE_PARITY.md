# SkillBridge AI: Complete Feature Parity Matrix

This document tracks all features present in the existing Python FastAPI + SQL codebase and specifies their exact target implementation in the MERN + Flutter stack, verification criteria, and test coverage.

### Parity Status Definitions
- **Implemented and tested**: Code is fully implemented in Node.js/MERN/Flutter and verified by automated or integration tests.
- **Implemented but not fully tested**: Code is implemented in both backend and frontend, but relies on manual runtime flow.
- **Partially implemented**: Core functionality exists, but secondary features or edge cases remain.
- **Blocked by external configuration**: Feature is fully coded but requires third-party API credentials (e.g. OpenAI or Gemini live keys) not configured in the local test environment.
- **Not implemented**: Feature has not yet been started.

---

## 1. Authentication & User Management Subsystem

| Feature | Original Implementation | Target Node.js / MERN Implementation | Flutter Integration | Parity Status | Verification & Testing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Student Registration** | `POST /api/v1/auth/register` (FastAPI + Bcrypt + SQLAlchemy) | `POST /api/v1/auth/register` (Express + bcryptjs + Mongoose User model) | `ApiClient.register()` | **Implemented and tested** | Status 201, returns JWT access & refresh tokens, user profile initialized. |
| **User Login** | `POST /api/v1/auth/login` (Bcrypt verify + JWT generation) | `POST /api/v1/auth/login` (bcryptjs verify + jsonwebtoken) | `ApiClient.login()` | **Implemented and tested** | Status 200, sets bearer token, enforces deactivated account rejection (403). |
| **Token Refresh** | `POST /api/v1/auth/refresh` (JWT decode + refresh validation) | `POST /api/v1/auth/refresh` (jsonwebtoken decode + refresh validation) | Automatic token refresh interceptor | **Implemented and tested** | Status 200, validates `type: refresh`, returns new access/refresh pair. |
| **Password Recovery** | `POST /api/v1/auth/forgot-password` (Simulated delivery) | `POST /api/v1/auth/forgot-password` (Simulated delivery mode) | `ApiClient.forgotPassword()` | **Implemented and tested** | Status 200, anti-enumeration protection (always returns uniform message). |
| **Get My Profile** | `GET /api/v1/users/me` (Auth Bearer token lookup) | `GET /api/v1/users/me` & `GET /api/v1/auth/me` (Auth Bearer middleware + populate profile) | `ApiClient.getCurrentUser()` | **Implemented and tested** | Status 200, returns user identity, role, and nested student profile on both routes. |
| **Update My Profile** | `PUT /api/v1/users/me` & `PUT /api/v1/users/me/profile` | `PUT /api/v1/users/me` & `PUT /api/v1/users/me/profile` | `StudentProfileScreen` / React `ProfilePage.jsx` | **Implemented and tested** | Status 200, updates full name, bio, target role, hours/week; synced across Web & Mobile. |
| **Protected User Lookup** | `GET /api/v1/users/{id}` (Self or Admin check) | `GET /api/v1/users/:id` (Self or Admin check) | Admin user inspection | **Implemented and tested** | Status 200 for self/admin; 403 Forbidden for cross-student access. |

---

## 2. Skill Taxonomy & Prerequisite DAG Subsystem

| Feature | Original Implementation | Target Node.js / MERN Implementation | Flutter Integration | Parity Status | Verification & Testing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **List Skills** | `GET /api/v1/skills` (Category filtering) | `GET /api/v1/skills` (Mongoose query with category regex/filter) | `ApiClient.getSkills()` | **Implemented and tested** | Status 200, returns all 9 skill domains. |
| **Skill Prerequisite Tree** | `GET /api/v1/skills/taxonomy/tree` (DAG with unlock status) | `GET /api/v1/skills/taxonomy/tree` (Recursive DAG resolution in `skillService.js`) | `ApiClient.getTaxonomyTree()` | **Implemented and tested** | Status 200, computes unlocked/locked status based on user prerequisite mastery. |
| **Learner Mastery Scores** | `GET /api/v1/skills/my-mastery` (Joined SkillMastery & Skill) | `GET /api/v1/skills/my-mastery` (Mongoose populate `skill_id`) | `ApiClient.getMyMastery()` | **Implemented and tested** | Status 200, returns mastery scores, confidence, and status per skill. |
| **Skill By Slug** | `GET /api/v1/skills/{slug}` | `GET /api/v1/skills/:slug` | Taxonomy detail screen | **Implemented and tested** | Status 200, returns skill description, category, and prerequisites. |

---

## 3. Assessments & Adaptive Engine Subsystem

| Feature | Original Implementation | Target Node.js / MERN Implementation | Flutter Integration | Parity Status | Verification & Testing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Assessment Catalog** | `GET /api/v1/assessments` | `GET /api/v1/assessments` | `ApiClient.getAssessments()` | **Implemented and tested** | Status 200, returns diagnostic and formative quizzes with question counts. |
| **Start Assessment** | `POST /api/v1/assessments/{id}/start` (Strips correct answers) | `POST /api/v1/assessments/:id/start` (Strips answer keys for security) | `ApiClient.startAssessment()` | **Implemented and tested** | Status 200, creates attempt record, returns questions without answer leaks. |
| **Submit Assessment** | `POST /api/v1/assessments/attempts/{id}/submit` | `POST /api/v1/assessments/attempts/:id/submit` (Server-side grading) | `ApiClient.submitAssessment()` | **Implemented and tested** | Status 200, calculates score, triggers Bayesian mastery update, returns feedback. |
| **Attempt Review** | `GET /api/v1/assessments/attempts/{id}` | `GET /api/v1/assessments/attempts/:id` | Attempt result screen | **Implemented and tested** | Status 200, validates attempt ownership, returns explanations. |
| **Attempt History** | `GET /api/v1/assessments/my-history` | `GET /api/v1/assessments/my-history` | History screen | **Implemented and tested** | Status 200, returns chronological list of attempts with score and pass status. |
| **Adaptive Next Activity** | `GET /api/v1/adaptive/next-activity` (Explainable heuristic) | `GET /api/v1/adaptive/next-activity` (`adaptiveEngine.js`) | Adaptive Dashboard card | **Implemented and tested** | Status 200, returns recommended activity, action type, and human reasoning string. |
| **Weak Concept Diagnosis** | `GET /api/v1/adaptive/weak-concepts` (Error rate threshold) | `GET /api/v1/adaptive/weak-concepts` (`adaptiveEngine.js`) | Diagnostics screen | **Implemented and tested** | Status 200, flags concepts with error rate >= 40% or mastery < 60%. |
| **Mastery Overview** | `GET /api/v1/adaptive/overview` | `GET /api/v1/adaptive/overview` | Learner Dashboard (`AdaptiveHomeTab` / React `DashboardPage`) | **Implemented and tested** | Status 200, returns enrolled/available/completed courses, quiz totals/avg score, overall progress, learning streak, recent quiz results, and activities. |
| **Courses & Lessons** | — | `GET /api/v1/courses`, `GET /api/v1/courses/:id`, `POST /enroll`, `POST /lessons/:lessonId/complete` | `CourseCatalogTab` -> `CourseDetailScreen` -> `LessonDetailScreen` & React `CoursesPage` | **Implemented and tested** | Status 200, all courses unlocked by default (`is_unlocked: true`), full lesson reader, completion percentage synced in MongoDB. |
| **ML Mastery Predictor** | `POST /api/v1/adaptive/predict-mastery` | `POST /api/v1/adaptive/predict-mastery` (Rule-based & ML predictor) | Settings / Dev tools | **Implemented and tested** | Status 200, returns transition probability and feature contributions. |

---

## 4. Career Intelligence & Roadmaps Subsystem

| Feature | Original Implementation | Target Node.js / MERN Implementation | Flutter Integration | Parity Status | Verification & Testing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **List Careers** | `GET /api/v1/careers` | `GET /api/v1/careers` | `ApiClient.getCareers()` | **Implemented and tested** | Status 200, returns industry, salary ranges, and required skills. |
| **Career Details** | `GET /api/v1/careers/{slug}` | `GET /api/v1/careers/:slug` | Career detail screen | **Implemented and tested** | Status 200, returns career profile and weighted skill requirements. |
| **Career Gap Analysis** | `GET /api/v1/careers/{slug}/gap-analysis` | `GET /api/v1/careers/:slug/gap-analysis` (`careerService.js`) | `ApiClient.getCareerGapAnalysis()` | **Implemented and tested** | Status 200, computes readiness percentage, prioritized gaps, and disclaimer. |
| **Generate Roadmap** | `POST /api/v1/careers/{slug}/generate-roadmap` | `POST /api/v1/careers/:slug/generate-roadmap` (`careerService.js`) | `ApiClient.generateRoadmap()` | **Implemented and tested** | Status 200, generates 30/60/90-day milestone checklist tailored to skill gaps. |
| **My Roadmaps** | `GET /api/v1/careers/my-roadmaps/all` | `GET /api/v1/careers/my-roadmaps/all` | Roadmap tracker | **Implemented and tested** | Status 200, returns user's active roadmaps and completion percentages. |

---

## 5. Hands-On Projects Subsystem

| Feature | Original Implementation | Target Node.js / MERN Implementation | Flutter Integration | Parity Status | Verification & Testing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Project Catalog** | `GET /api/v1/projects` | `GET /api/v1/projects` | `ApiClient.getProjects()` | **Implemented and tested** | Status 200, returns project templates with difficulty and recommended skills. |
| **Project Details** | `GET /api/v1/projects/{id}` | `GET /api/v1/projects/:id` | Project detail screen | **Implemented and tested** | Status 200, returns evaluation rubrics and milestone specifications. |
| **Update Progress** | `POST /api/v1/projects/{id}/progress` | `POST /api/v1/projects/:id/progress` | Progress update dialog | **Implemented and tested** | Status 200, updates completion percentage, notes, and status. |
| **My Portfolio** | `GET /api/v1/projects/my-portfolio` | `GET /api/v1/projects/my-portfolio` | Portfolio screen | **Implemented and tested** | Status 200, returns active and completed projects with evidence notes. |

---

## 6. AI Tutor, RAG & Safe Coding Subsystem

| Feature | Original Implementation | Target Node.js / MERN Implementation | Flutter Integration | Parity Status | Verification & Testing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tutor Status** | `GET /api/v1/tutor/status` | `GET /api/v1/tutor/status` | `ApiClient.getTutorStatus()` | **Implemented and tested** | Status 200, reports provider, fallback availability, and rate limits. |
| **Direct Tutor Query** | `POST /api/v1/tutor/query` (Rate limited) | `POST /api/v1/tutor/query` (`tutorService.js`) | `ApiClient.queryTutor()` | **Implemented and tested** | Status 200, executes query with transparent fallback and rate limits (429 on cap). |
| **Live External LLM (OpenAI/Gemini)** | LLM API Call | Pluggable `aiAdapter.js` (OpenAI, Gemini) | AI Chat Screen | **Blocked by external configuration** | Requires user API key (`OPENAI_API_KEY` or `GEMINI_API_KEY`) in `.env`. Seamlessly runs on deterministic pedagogical fallback when unset. |
| **Create Conversation** | `POST /api/v1/chat/conversations` | `POST /api/v1/chat/conversations` | Chat thread creator | **Implemented and tested** | Status 200, private thread scoped to user. |
| **List Conversations** | `GET /api/v1/chat/conversations` | `GET /api/v1/chat/conversations` | Conversation drawer | **Implemented and tested** | Status 200, lists user's conversations ordered by recency. |
| **Conversation Messages** | `GET /api/v1/chat/conversations/{id}` | `GET /api/v1/chat/conversations/:id` | Chat message view | **Implemented and tested** | Status 200, validates thread ownership, returns message history. |
| **Send Message** | `POST /api/v1/chat/conversations/{id}/messages` | `POST /api/v1/chat/conversations/:id/messages` | Chat input box | **Implemented and tested** | Status 200, appends user message, returns assistant response with citations. |
| **Delete Conversation** | `DELETE /api/v1/chat/conversations/{id}` | `DELETE /api/v1/chat/conversations/:id` | Delete confirmation | **Implemented and tested** | Status 200, permanently removes thread and child messages. |
| **RAG Document Upload** | `POST /api/v1/rag/documents/upload` (PDF/TXT/MD) | `POST /api/v1/rag/documents/upload` (`multer` + text extraction) | Document upload dialog | **Implemented and tested** | Status 200, chunks text, generates content hash, builds vector index. |
| **List RAG Documents** | `GET /api/v1/rag/documents` | `GET /api/v1/rag/documents` | Document library | **Implemented and tested** | Status 200, lists approved documents and chunk counts. |
| **Grounded RAG Query** | `POST /api/v1/rag/query` | `POST /api/v1/rag/query` (`ragService.js`) | RAG search dialog | **Implemented and tested** | Status 200, returns grounded answer with source citations and similarity scores. |
| **Coding Problems** | `GET /api/v1/coding/problems` | `GET /api/v1/coding/problems` | Practice problem list | **Implemented and tested** | Status 200, returns algorithmic problems filtered by skill or difficulty. |
| **Problem Details** | `GET /api/v1/coding/problems/{slug}` | `GET /api/v1/coding/problems/:slug` | Problem editor screen | **Implemented and tested** | Status 200, delivers starter code, hints, and hides secret test cases. |
| **Submit Code Solution**| `POST /api/v1/coding/problems/{id}/submit` | `POST /api/v1/coding/problems/:id/submit` (Static AST Scanner + Isolated Subprocess Mode) | Code submission runner | **Implemented and tested** | Default `safe_static_analysis` when `CODING_SANDBOX_ENABLED=false`; isolated `spawnSync` child subprocess (`env: {}`, `--disallow-code-generation-from-strings`, `--no-addons`, memory/time bounds) when `CODING_SANDBOX_ENABLED=true`. No in-process `node:vm`. |
| **My Submissions** | `GET /api/v1/coding/my-submissions` | `GET /api/v1/coding/my-submissions` | Submissions history | **Implemented and tested** | Status 200, lists student attempts with test results and execution mode. |
| **Coding Recommendations**| `GET /api/v1/coding/recommendations` | `GET /api/v1/coding/recommendations` | Practice recommendations | **Implemented and tested** | Status 200, suggests practice problems addressing recent syntax or logic errors. |

---

## 7. Administrative Console Subsystem

| Feature | Original Implementation | Target Node.js / MERN Implementation | Flutter Integration | Parity Status | Verification & Testing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin User List** | `GET /api/v1/admin/users` (Search & pagination) | `GET /api/v1/admin/users` | Admin user table | **Implemented and tested** | Status 200, filters by role, active state, and search query. |
| **User Status Toggle** | `PATCH /api/v1/admin/users/{id}/status` | `PATCH /api/v1/admin/users/:id/status` | Status switch | **Implemented and tested** | Status 200, logs audit event, prevents self-deactivation. |
| **User Role Change** | `PATCH /api/v1/admin/users/{id}/role` | `PATCH /api/v1/admin/users/:id/role` | Role dropdown | **Implemented and tested** | Status 200, elevates or restricts role, logs audit event. |
| **Skill Taxonomy Admin**| `POST /api/v1/admin/skills` & `DELETE` | `POST /api/v1/admin/skills` & `DELETE` | Flutter Admin `CurriculumScreen` & React `AdminConsolePage` | **Implemented and tested** | Status 201 on create; 200 on delete; audit logged. |
| **Assessment Admin** | `POST /api/v1/admin/assessments` & `DELETE` | `POST /api/v1/admin/assessments` & `DELETE` | Flutter Admin `CurriculumScreen` & React `AdminConsolePage` | **Implemented and tested** | Status 201 on create; 200 on delete; audit logged. |
| **Question Admin** | `POST /api/v1/admin/assessments/{id}/questions` | `POST /api/v1/admin/assessments/:id/questions` | Question editor | **Implemented and tested** | Status 201 on create; 200 on delete; audit logged. |
| **Career Pathway Admin**| `POST /api/v1/admin/careers` & `DELETE` | `POST /api/v1/admin/careers` & `DELETE` | `AdminApiClient` & React `AdminConsolePage` Careers tab | **Implemented and tested** | Status 201 on create; 200 on delete; audit logged. |
| **Project Template Admin**| `POST /api/v1/admin/projects` & `DELETE`| `POST /api/v1/admin/projects` & `DELETE` | `AdminApiClient` & React `AdminConsolePage` Projects tab | **Implemented and tested** | Status 201 on create; 200 on delete; audit logged. |
| **Document Approval** | `PATCH /api/v1/admin/documents/{id}/approval`| `PATCH /api/v1/admin/documents/:id/approval` | Flutter Admin `KnowledgeManagementScreen` & React `AdminConsolePage` | **Implemented and tested** | Status 200, lists pending/approved docs via `/admin/documents` and updates approval state. |
| **Feedback Management** | `GET /api/v1/admin/feedback` & `PATCH` status| `GET /api/v1/admin/feedback` & `PATCH` status| Flutter Admin `FeedbackReviewScreen` & React `AdminConsolePage` | **Implemented and tested** | Status 200, updates status to pending/reviewed/resolved with notes. |
| **Platform Analytics** | `GET /api/v1/admin/analytics` | `GET /api/v1/admin/analytics` (`analyticsService.js`) | Flutter Admin `DashboardScreen` & `AnalyticsDashboardScreen` | **Implemented and tested** | Status 200, returns both flat metrics and structured telemetry objects. |
| **Compliance Audit Logs**| `GET /api/v1/admin/audit-logs` | `GET /api/v1/admin/audit-logs` | Audit trail viewer | **Implemented and tested** | Status 200, filters by action code and entity type with admin email. |
| **CSV Report Exports** | `GET /api/v1/admin/export/{type}.csv` | `GET /api/v1/admin/export/:type.csv` | CSV download buttons | **Implemented and tested** | Status 200, returns text/csv content with correct attachment headers and download blob support. |
