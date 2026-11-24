# SkillBridge AI: API Migration Map

This document establishes the exact 1-to-1 routing and contract migration map from the Python FastAPI endpoints to the target Node.js Express controllers, ensuring that both the React web application and the Flutter mobile client communicate seamlessly with the new backend.

Base URL Prefix: `/api/v1`

---

## 1. Authentication & System Health

| HTTP | Endpoint | Access Level | Original FastAPI Source | Target Express Controller | Request Payload | Response Schema | Flutter Client Method |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | `endpoints/health.py:get_health` | `controllers/healthController.js:getHealth` | None | `{ status, environment, project_name, version, database_connected, details }` | `ApiClient.checkHealth()` |
| `POST` | `/auth/register` | Public | `endpoints/auth.py:register` | `controllers/authController.js:register` | `{ email, password, full_name }` | `{ access_token, refresh_token, token_type, expires_in, user }` | `ApiClient.register()` |
| `POST` | `/auth/login` | Public | `endpoints/auth.py:login` | `controllers/authController.js:login` | `{ email, password }` | `{ access_token, refresh_token, token_type, expires_in, user }` | `ApiClient.login()` |
| `POST` | `/auth/refresh` | Public | `endpoints/auth.py:refresh_token` | `controllers/authController.js:refresh` | `{ refresh_token }` | `{ access_token, refresh_token, token_type, expires_in, user }` | `ApiClient._refreshToken()` |
| `POST` | `/auth/forgot-password` | Public | `endpoints/auth.py:forgot_password` | `controllers/authController.js:forgotPassword` | `{ email }` | `{ message, delivery_status, note }` | `ApiClient.forgotPassword()` |
| `GET` | `/auth/me` | Authenticated | `endpoints/users.py:get_current_user_profile` | `controllers/userController.js:getMe` | None | `{ id, email, full_name, role, is_active, is_verified, profile, created_at }` | `ApiClient.getCurrentUser()` |

---

## 2. User & Student Profiles

| HTTP | Endpoint | Access Level | Original FastAPI Source | Target Express Controller | Request Payload | Response Schema | Flutter Client Method |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/users/me` | Authenticated | `endpoints/users.py:get_current_user_profile` | `controllers/userController.js:getMe` | None | `{ id, email, full_name, role, is_active, is_verified, profile, created_at }` | `ApiClient.getCurrentUser()` |
| `PUT` | `/users/me` | Authenticated | `endpoints/users.py:update_current_user` | `controllers/userController.js:updateMe` | `{ full_name? }` | User Response | `ApiClient.updateUser()` |
| `PUT` | `/users/me/profile` | Authenticated | `endpoints/users.py:update_student_profile` | `controllers/userController.js:updateProfile` | `{ headline?, bio?, target_role?, education_level?, target_hours_per_week?, preferred_learning_style? }` | Profile Response | `ApiClient.updateStudentProfile()` |
| `GET` | `/users/:id` | Self or Admin | `endpoints/users.py:get_user_by_id` | `controllers/userController.js:getUserById` | None | User Response | `ApiClient.getUserById()` |

---

## 3. Skill Taxonomy & Prerequisite DAG

| HTTP | Endpoint | Access Level | Original FastAPI Source | Target Express Controller | Request Payload | Response Schema | Flutter Client Method |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/skills` | Optional Auth | `endpoints/skills.py:list_skills` | `controllers/skillController.js:listSkills` | Query: `?category=` | Array of `{ id, slug, title, category, description, difficulty_level }` | `ApiClient.getSkills()` |
| `GET` | `/skills/taxonomy/tree` | Optional Auth | `endpoints/skills.py:get_taxonomy_tree` | `controllers/skillController.js:getTaxonomyTree` | None | Array of `{ id, slug, title, category, difficulty_level, prerequisites, is_unlocked, mastery_score }` | `ApiClient.getTaxonomyTree()` |
| `GET` | `/skills/my-mastery` | Authenticated | `endpoints/skills.py:get_my_mastery` | `controllers/skillController.js:getMyMastery` | None | Array of `{ id, skill_id, skill_slug, skill_title, category, mastery_score, confidence_score, status }` | `ApiClient.getMyMastery()` |
| `GET` | `/skills/:slug` | Public | `endpoints/skills.py:get_skill_by_slug` | `controllers/skillController.js:getSkillBySlug` | None | Skill Response with prerequisites | `ApiClient.getSkillBySlug()` |
| `GET` | `/courses` | Optional Auth | — (Node extension) | `controllers/courseController.js:listCourses` | Query: `?category=&difficulty=` | Array of unlocked Courses (`is_unlocked: true`, `completion_percentage`, `modules_count`, `total_lessons_count`) | `ApiClient.getCourses()` |
| `GET` | `/courses/:id` | Optional Auth | — (Node extension) | `controllers/courseController.js:getCourseDetail` | None | Course with modules, lessons (`is_completed`), linked assessment | `ApiClient.getCourseDetail()` |
| `POST` | `/courses/:id/enroll` | Authenticated | — (Node extension) | `controllers/courseController.js:enrollInCourse` | None | Enrolls user and initializes persisted `CourseProgress` | `ApiClient.enrollInCourse()` |
| `POST` | `/courses/:id/lessons/:lessonId/complete` | Authenticated | — (Node extension) | `controllers/courseController.js:completeLesson` | `{ completed?: bool }` | Updates completed lesson IDs, `completion_percentage`, `SkillMastery`, and `LearnerActivity` | `ApiClient.completeLesson()` |

---

## 4. Assessments & Adaptive Engine

| HTTP | Endpoint | Access Level | Original FastAPI Source | Target Express Controller | Request Payload | Response Schema | Flutter Client Method |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/assessments` | Public | `endpoints/assessments.py:list_assessments` | `controllers/assessmentController.js:listAssessments` | Query: `?skill_id=` | Array of Assessment items | `ApiClient.getAssessments()` |
| `POST` | `/assessments/:id/start` | Authenticated | `endpoints/assessments.py:start_assessment` | `controllers/assessmentController.js:startAssessment` | None | `{ attempt_id, assessment_id, title, time_limit_minutes, questions: [...] }` | `ApiClient.startAssessment()` |
| `POST` | `/assessments/attempts/:id/submit` | Authenticated | `endpoints/assessments.py:submit_assessment` | `controllers/assessmentController.js:submitAssessment` | `{ responses: [{ question_id, selected_option \| learner_response_json, time_spent_seconds }] }` | `{ attempt_id, assessment_title, score_achieved, is_passed, total_points_earned, total_points_possible, adaptive_feedback, questions_breakdown, question_results }` | `ApiClient.submitAssessment()` |
| `GET` | `/assessments/attempts/:id` | Authenticated | `endpoints/assessments.py:get_attempt_results` | `controllers/assessmentController.js:getAttemptDetails` | None | Completed Attempt Result with answers & explanations | `ApiClient.getAttemptDetails()` |
| `GET` | `/assessments/my-history` | Authenticated | `endpoints/assessments.py:get_attempt_history` | `controllers/assessmentController.js:getMyHistory` | None | Chronological Attempt Summary list | `ApiClient.getAttemptHistory()` |
| `GET` | `/adaptive/next-activity` | Authenticated | `endpoints/adaptive.py:get_next_recommended_activity` | `controllers/adaptiveController.js:getNextActivity` | None | `{ recommendation_type, target_entity_id, title, rationale, action_url, difficulty }` | `ApiClient.getNextRecommendedActivity()` |
| `GET` | `/adaptive/weak-concepts` | Authenticated | `endpoints/adaptive.py:get_weak_concepts` | `controllers/adaptiveController.js:getWeakConcepts` | None | Array of `{ skill_id, skill_title, error_rate, current_mastery, recommendation }` | `ApiClient.getWeakConcepts()` |
| `GET` | `/adaptive/overview` | Authenticated | `endpoints/adaptive.py:get_mastery_overview` | `controllers/adaptiveController.js:getOverview` | None | `{ total_skills, mastered_count, in_progress_count, weak_concepts_count, average_mastery }` | `ApiClient.getMasteryOverview()` |
| `POST` | `/adaptive/predict-mastery` | Authenticated | `endpoints/adaptive.py:predict_mastery` | `controllers/adaptiveController.js:predictMastery` | Feature map `{ historical_accuracy, prior_attempts_count, ... }` | `{ predicted_probability, status, explanation }` | (Diagnostic testing) |

---

## 5. Career Intelligence & Roadmaps

| HTTP | Endpoint | Access Level | Original FastAPI Source | Target Express Controller | Request Payload | Response Schema | Flutter Client Method |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/careers` | Public | `endpoints/careers.py:list_careers` | `controllers/careerController.js:listCareers` | None | Array of Career pathways with requirements | `ApiClient.getCareers()` |
| `GET` | `/careers/:slug` | Public | `endpoints/careers.py:get_career_details` | `controllers/careerController.js:getCareerDetails` | None | Single Career item with competencies | `ApiClient.getCareerDetails()` |
| `GET` | `/careers/:slug/gap-analysis` | Authenticated | `endpoints/careers.py:analyze_career_gap` | `controllers/careerController.js:getGapAnalysis` | None | `{ career_title, readiness_percentage, skill_gaps: [...], disclaimer }` | `ApiClient.getCareerGapAnalysis()` |
| `POST` | `/careers/:slug/generate-roadmap` | Authenticated | `endpoints/careers.py:generate_career_roadmap` | `controllers/careerController.js:generateRoadmap` | `{ plan_type: '30_day'\|'60_day'\|'90_day' }` | `{ id, title, plan_type, milestones: [...], completion_percentage }` | `ApiClient.generateRoadmap()` |
| `GET` | `/careers/my-roadmaps/all` | Authenticated | `endpoints/careers.py:get_my_roadmaps` | `controllers/careerController.js:getMyRoadmaps` | None | Array of Roadmap objects | `ApiClient.getMyRoadmaps()` |

---

## 6. Hands-On Projects

| HTTP | Endpoint | Access Level | Original FastAPI Source | Target Express Controller | Request Payload | Response Schema | Flutter Client Method |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/projects` | Optional Auth | `endpoints/projects.py:list_projects` | `controllers/projectController.js:listProjects` | None | Array of Projects with user enrollment state | `ApiClient.getProjects()` |
| `GET` | `/projects/:id` | Optional Auth | `endpoints/projects.py:get_project_details` | `controllers/projectController.js:getProjectDetails` | None | Single Project with rubrics and milestones | `ApiClient.getProjectDetails()` |
| `POST` | `/projects/:id/progress` | Authenticated | `endpoints/projects.py:update_project_progress` | `controllers/projectController.js:updateProgress` | `{ status?, completion_percentage?, evidence_notes? }` | Updated Progress record | `ApiClient.updateProjectProgress()` |
| `GET` | `/projects/my-portfolio` | Authenticated | `endpoints/projects.py:get_my_portfolio` | `controllers/projectController.js:getMyPortfolio` | None | User's active and completed projects | `ApiClient.getMyPortfolio()` |

---

## 7. AI Tutor, RAG & Coding Sandbox

| HTTP | Endpoint | Access Level | Original FastAPI Source | Target Express Controller | Request Payload | Response Schema | Flutter Client Method |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/tutor/status` | Authenticated | `endpoints/tutor.py:get_tutor_status` | `controllers/tutorController.js:getStatus` | None | `{ ai_provider, is_live_llm, fallback_available, model_name, daily_rate_limit }` | `ApiClient.getTutorStatus()` |
| `POST` | `/tutor/query` | Authenticated | `endpoints/tutor.py:query_tutor` | `controllers/tutorController.js:queryTutor` | `{ prompt, skill_context? }` | `{ content, is_fallback, provider, model, tokens_used }` | `ApiClient.queryTutor()` |
| `POST` | `/chat/conversations` | Authenticated | `endpoints/chat.py:create_conversation` | `controllers/chatController.js:createConversation` | `{ title, topic? }` | Conversation item | `ApiClient.createConversation()` |
| `GET` | `/chat/conversations` | Authenticated | `endpoints/chat.py:list_conversations` | `controllers/chatController.js:listConversations` | None | List of conversations | `ApiClient.getConversations()` |
| `GET` | `/chat/conversations/:id` | Authenticated | `endpoints/chat.py:get_conversation` | `controllers/chatController.js:getConversation` | None | Conversation with chronologically sorted messages | `ApiClient.getConversation()` |
| `POST` | `/chat/conversations/:id/messages` | Authenticated | `endpoints/chat.py:send_message` | `controllers/chatController.js:sendMessage` | `{ content, use_rag? }` | Assistant Message with source citations | `ApiClient.sendMessage()` |
| `DELETE` | `/chat/conversations/:id` | Authenticated | `endpoints/chat.py:delete_conversation` | `controllers/chatController.js:deleteConversation` | None | `{ message: "Conversation deleted successfully." }` | `ApiClient.deleteConversation()` |
| `POST` | `/rag/documents/upload` | Authenticated | `endpoints/rag.py:upload_document` | `controllers/ragController.js:uploadDocument` | Multipart File + title | `{ document_id, title, filename, file_size_bytes, chunk_count, message }` | `ApiClient.uploadDocument()` |
| `GET` | `/rag/documents` | Authenticated | `endpoints/rag.py:list_documents` | `controllers/ragController.js:listDocuments` | None | List of approved documents | `ApiClient.getDocuments()` |
| `GET` | `/rag/documents/:id` | Authenticated | `endpoints/rag.py:get_document_detail` | `controllers/ragController.js:getDocumentDetail` | None | Document with indexed chunks | `ApiClient.getDocumentDetail()` |
| `POST` | `/rag/query` | Authenticated | `endpoints/rag.py:query_rag` | `controllers/ragController.js:queryRAG` | `{ query }` | `{ query, answer, evidence_sufficient, is_fallback, sources: [...] }` | `ApiClient.queryRAG()` |
| `POST` | `/rag/rebuild-index` | Admin Only | `endpoints/rag.py:rebuild_vector_index` | `controllers/ragController.js:rebuildIndex` | None | `{ message: "Vector index successfully rebuilt..." }` | `AdminApiClient.rebuildVectorIndex()` |
| `GET` | `/coding/problems` | Authenticated | `endpoints/coding.py:list_problems` | `controllers/codingController.js:listProblems` | Query: `?skill_slug=&difficulty=` | List of coding problems | `ApiClient.getCodingProblems()` |
| `GET` | `/coding/problems/:slug` | Authenticated | `endpoints/coding.py:get_problem` | `controllers/codingController.js:getProblem` | None | Problem detail with starter code and public test cases | `ApiClient.getCodingProblem()` |
| `POST` | `/coding/problems/:id/submit` | Authenticated | `endpoints/coding.py:submit_solution` | `controllers/codingController.js:submitSolution` | `{ submitted_code }` | Submission with status, test results, and execution mode | `ApiClient.submitCodingSolution()` |
| `GET` | `/coding/my-submissions` | Authenticated | `endpoints/coding.py:list_my_submissions` | `controllers/codingController.js:getMySubmissions` | Query: `?problem_id=` | List of student submissions | `ApiClient.getMySubmissions()` |
| `GET` | `/coding/recommendations` | Authenticated | `endpoints/coding.py:get_recommendations` | `controllers/codingController.js:getRecommendations` | None | Recommendations addressing student mistakes | `ApiClient.getCodingRecommendations()` |
| `POST` | `/feedback` | Authenticated | `endpoints/feedback.py:submit_feedback` | `controllers/feedbackController.js:submitFeedback` | `{ category, title, message }` | Created Feedback item | `ApiClient.submitFeedback()` |
| `GET` | `/feedback/my-feedback` | Authenticated | `endpoints/feedback.py:list_my_feedback` | `controllers/feedbackController.js:getMyFeedback` | None | List of submitted feedbacks | `ApiClient.getMyFeedback()` |

---

## 8. Administrative Console (`/admin/*`)

| HTTP | Endpoint | Access Level | Original FastAPI Source | Target Express Controller | Request Payload | Response Schema | Admin Client Method |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/admin/users` | Admin Only | `endpoints/admin.py:list_users` | `controllers/adminController.js:listUsers` | Query: `?search=&role=&is_active=&skip=&limit=` | `{ items: [...], total, skip, limit }` | `AdminApiClient.getUsers()` |
| `GET` | `/admin/users/:id` | Admin Only | `endpoints/admin.py:get_user_detail` | `controllers/adminController.js:getUserDetail` | None | User Detail with profile | `AdminApiClient.getUserDetail()` |
| `PATCH` | `/admin/users/:id/status` | Admin Only | `endpoints/admin.py:update_user_status` | `controllers/adminController.js:updateUserStatus` | `{ is_active: bool }` | Updated User | `AdminApiClient.updateUserStatus()` |
| `PATCH` | `/admin/users/:id/role` | Admin Only | `endpoints/admin.py:update_user_role` | `controllers/adminController.js:updateUserRole` | `{ role: 'student'\|'instructor'\|'admin' }` | Updated User | `AdminApiClient.updateUserRole()` |
| `POST` | `/admin/skills` | Admin Only | `endpoints/admin.py:create_skill` | `controllers/adminController.js:createSkill` | `{ slug, title, category, description?, difficulty_level }` | `{ message, skill_id, slug }` | `AdminApiClient.createSkill()` |
| `DELETE` | `/admin/skills/:id` | Admin Only | `endpoints/admin.py:delete_skill` | `controllers/adminController.js:deleteSkill` | None | `{ message: "Skill deleted successfully." }` | `AdminApiClient.deleteSkill()` |
| `POST` | `/admin/assessments` | Admin Only | `endpoints/admin.py:create_assessment` | `controllers/adminController.js:createAssessment` | `{ title, description?, skill_id, assessment_type, pass_percentage, time_limit_minutes? }` | `{ message, assessment_id }` | `AdminApiClient.createAssessment()` |
| `DELETE` | `/admin/assessments/:id` | Admin Only | `endpoints/admin.py:delete_assessment` | `controllers/adminController.js:deleteAssessment` | None | `{ message: "Assessment deleted successfully." }` | `AdminApiClient.deleteAssessment()` |
| `POST` | `/admin/assessments/:id/questions` | Admin Only | `endpoints/admin.py:add_question` | `controllers/adminController.js:addQuestion` | `{ prompt, question_type, options_json, correct_answer_json, explanation?, difficulty, points }` | `{ message, question_id }` | `AdminApiClient.addQuestion()` |
| `DELETE` | `/admin/questions/:id` | Admin Only | `endpoints/admin.py:delete_question` | `controllers/adminController.js:deleteQuestion` | None | `{ message: "Question deleted successfully." }` | `AdminApiClient.deleteQuestion()` |
| `POST` | `/admin/careers` | Admin Only | `endpoints/admin.py:create_career` | `controllers/adminController.js:createCareer` | `{ slug, title, description?, average_salary_range?, industry? }` | `{ message, career_id, slug }` | `AdminApiClient.createCareer()` |
| `DELETE` | `/admin/careers/:id` | Admin Only | `endpoints/admin.py:delete_career` | `controllers/adminController.js:deleteCareer` | None | `{ message: "Career deleted successfully." }` | `AdminApiClient.deleteCareer()` |
| `POST` | `/admin/projects` | Admin Only | `endpoints/admin.py:create_project_template` | `controllers/adminController.js:createProjectTemplate` | `{ title, description, difficulty, rubric_json, milestones_json, recommended_skills_json?, career_id? }` | `{ message, project_id }` | `AdminApiClient.createProject()` |
| `DELETE` | `/admin/projects/:id` | Admin Only | `endpoints/admin.py:delete_project_template` | `controllers/adminController.js:deleteProjectTemplate` | None | `{ message: "Project deleted successfully." }` | `AdminApiClient.deleteProject()` |
| `GET` | `/admin/documents` | Admin Only | `endpoints/admin.py:list_admin_documents` | `controllers/adminController.js:listDocuments` | None | List of all documents with approval flags | `AdminApiClient.getDocuments()` |
| `PATCH` | `/admin/documents/:id/approval` | Admin Only | `endpoints/admin.py:set_document_approval` | `controllers/adminController.js:setDocumentApproval` | `{ is_approved: bool }` | `{ message: "Document approval set..." }` | `AdminApiClient.setDocumentApproval()` |
| `GET` | `/admin/feedback` | Admin Only | `endpoints/admin.py:list_feedback` | `controllers/adminController.js:listFeedback` | Query: `?category=&status=&skip=&limit=` | `{ items: [...], total, skip, limit }` | `AdminApiClient.getFeedback()` |
| `PATCH` | `/admin/feedback/:id/status` | Admin Only | `endpoints/admin.py:update_feedback_status` | `controllers/adminController.js:updateFeedbackStatus` | `{ status: 'pending'\|'reviewed'\|'resolved', admin_notes? }` | Updated Feedback | `AdminApiClient.updateFeedbackStatus()` |
| `GET` | `/admin/analytics` | Admin Only | `endpoints/admin.py:get_analytics` | `controllers/adminController.js:getAnalytics` | None | Flat & structured metrics (`total_users`, `total_skills`, `total_assessments_taken`, `pass_rate`, `user_metrics`, `assessment_metrics`, `skill_metrics`, `career_metrics`, `content_metrics`, `activity_metrics`, `ai_metrics`) | `AdminApiClient.getAnalytics()` |
| `GET` | `/admin/audit-logs` | Admin Only | `endpoints/admin.py:get_audit_logs` | `controllers/adminController.js:getAuditLogs` | Query: `?action=&entity_type=&skip=&limit=` | `{ items: [...], total, skip, limit }` | `AdminApiClient.getAuditLogs()` |
| `GET` | `/admin/export/:type.csv` | Admin Only | `endpoints/admin.py:export_*_csv` | `controllers/adminController.js:exportCsv` | Path: `type` = `users` \| `assessment-attempts` \| `audit-logs` | CSV formatted string with attachment header | `AdminApiClient.exportCsv()` |
