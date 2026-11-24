import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/database.js';
import {
  Counter,
  User,
  StudentProfile,
  Skill,
  SkillPrerequisite,
  SkillMastery,
  Course,
  CourseProgress,
  Assessment,
  Question,
  AssessmentAttempt,
  AssessmentResponse,
  Career,
  CareerRequirement,
  Roadmap,
  Project,
  StudentProjectProgress,
  CodingProblem,
  CodingSubmission,
  ChatConversation,
  ChatMessage,
  Document,
  DocumentChunk,
  Feedback,
  LearnerActivity,
  AdminAuditLog,
} from '../src/models/index.js';

describe('SkillBridge AI: Complete Node.js Backend API Integration Suite', () => {
  let studentToken = '';
  let studentId = null;
  let adminToken = '';
  let adminId = null;
  let testSkillId = null;
  let testAssessmentId = null;
  let testCareerSlug = 'full-stack-dev';
  let testProblemId = null;

  beforeAll(async () => {
    await connectDB();

    // Clean isolated test collections completely
    await Promise.all([
      Counter.deleteMany({}),
      User.deleteMany({}),
      StudentProfile.deleteMany({}),
      Skill.deleteMany({}),
      SkillPrerequisite.deleteMany({}),
      SkillMastery.deleteMany({}),
      Assessment.deleteMany({}),
      Question.deleteMany({}),
      AssessmentAttempt.deleteMany({}),
      AssessmentResponse.deleteMany({}),
      Career.deleteMany({}),
      CareerRequirement.deleteMany({}),
      Roadmap.deleteMany({}),
      Project.deleteMany({}),
      StudentProjectProgress.deleteMany({}),
      CodingProblem.deleteMany({}),
      CodingSubmission.deleteMany({}),
      ChatConversation.deleteMany({}),
      ChatMessage.deleteMany({}),
      Document.deleteMany({}),
      DocumentChunk.deleteMany({}),
      Feedback.deleteMany({}),
      LearnerActivity.deleteMany({}),
      AdminAuditLog.deleteMany({}),
      Course.deleteMany({}),
      CourseProgress.deleteMany({}),
    ]);

    // Seed test skills
    const s1 = await Skill.create({
      id: 1,
      slug: 'python-basics',
      title: 'Python Fundamentals',
      category: 'Python',
      difficulty_level: 'beginner',
    });
    testSkillId = s1.id;

    const s2 = await Skill.create({
      id: 2,
      slug: 'python-oop',
      title: 'Python OOP',
      category: 'Python',
      difficulty_level: 'intermediate',
    });

    await SkillPrerequisite.create({
      id: 1,
      skill_id: s2.id,
      prerequisite_skill_id: s1.id,
      requirement_type: 'mandatory',
    });

    // Seed test assessment & question
    const asm = await Assessment.create({
      id: 1,
      title: 'Python Syntax Diagnostic',
      skill_id: s1.id,
      assessment_type: 'diagnostic',
      pass_percentage: 75.0,
      time_limit_minutes: 15,
    });
    testAssessmentId = asm.id;

    await Question.create({
      id: 1,
      assessment_id: asm.id,
      prompt: 'Which keyword defines a function in Python?',
      options_json: ['func', 'def', 'function', 'fn'],
      correct_answer_json: 'def',
      explanation: 'Python uses the def keyword to define functions.',
      points: 10,
    });

    // Seed test career & requirement
    const cr = await Career.create({
      id: 1,
      slug: testCareerSlug,
      title: 'Full Stack Developer',
      average_salary_range: '$85,000 - $125,000',
      industry: 'Software Engineering',
    });

    await CareerRequirement.create({
      id: 1,
      career_id: cr.id,
      skill_id: s1.id,
      minimum_mastery_level: 0.8,
      weight: 1.0,
    });

    // Seed test unlocked course with modules and lessons
    await Course.create({
      id: 1,
      slug: 'python-programming',
      title: 'Python Programming',
      category: 'Python',
      difficulty_level: 'beginner',
      is_unlocked: true,
      skill_id: s1.id,
      skill_ref: s1._id,
      assessment_id: asm.id,
      assessment_ref: asm._id,
      modules: [
        {
          module_id: 'py-m1',
          title: 'Python Core',
          order: 1,
          lessons: [
            { lesson_id: 'py-l1', title: 'Functions & Scope', order: 1, duration_minutes: 15, content: 'Learn def functions.' },
            { lesson_id: 'py-l2', title: 'Collections & Sets', order: 2, duration_minutes: 15, content: 'Learn list and set.' },
          ],
        },
      ],
    });

    // Seed test project
    await Project.create({
      id: 1,
      title: 'Microservices REST API',
      description: 'Build a production-ready REST service.',
      difficulty: 'intermediate',
      rubric_json: { criteria: 'Completeness' },
      milestones_json: [{ title: 'Setup Repo' }],
    });

    // Seed test coding problem
    const prob = await CodingProblem.create({
      id: 1,
      slug: 'hello-world',
      title: 'Hello World Function',
      description: 'Return hello world',
      difficulty: 'easy',
      skill_slug: 'python-basics',
      starter_code: 'def hello():\n    return "hello"',
      test_cases_json: [{ input: '', expected_output: 'hello', is_hidden: false }],
    });
    testProblemId = prob.id;
  });

  afterAll(async () => {
    await disconnectDB();
  });

  // 1. Health & Discovery
  test('GET / - Discovery endpoint returns operational status', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('operational');
    expect(res.body.api_v1).toBe('/api/v1');
  });

  test('GET /api/v1/health - Service health returns healthy', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.database_connected).toBe(true);
  });

  // 2. Authentication & Registration
  test('POST /api/v1/auth/register - Register student successfully', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'student_tester@skillbridge.ai',
      password: 'SecurePassword123!',
      full_name: 'Jane Doe',
    });

    expect(res.status).toBe(201);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.refresh_token).toBeDefined();
    expect(res.body.user.email).toBe('student_tester@skillbridge.ai');
    expect(res.body.user.role).toBe('student');

    studentToken = res.body.access_token;
    studentId = res.body.user.id;
  });

  test('POST /api/v1/auth/register - Prevent duplicate registration', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'student_tester@skillbridge.ai',
      password: 'AnotherPassword!',
      full_name: 'Jane Doe Duplicate',
    });
    expect(res.status).toBe(409);
  });

  test('POST /api/v1/auth/login - Login student successfully', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'student_tester@skillbridge.ai',
      password: 'SecurePassword123!',
    });
    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
  });

  test('POST /api/v1/auth/login - Reject invalid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'student_tester@skillbridge.ai',
      password: 'WrongPassword!',
    });
    expect(res.status).toBe(401);
  });

  // 3. User Profile
  test('GET /api/v1/users/me - Return authenticated student profile', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(studentId);
    expect(res.body.profile).toBeDefined();
  });

  test('PUT /api/v1/users/me - Update user full name', async () => {
    const res = await request(app)
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ full_name: 'Jane Smith' });

    expect(res.status).toBe(200);
    expect(res.body.full_name).toBe('Jane Smith');
  });

  // 4. Skills & Taxonomy
  test('GET /api/v1/skills - List catalog skills', async () => {
    const res = await request(app).get('/api/v1/skills');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  test('GET /api/v1/skills/taxonomy/tree - Hierarchical DAG with unlock states', async () => {
    const res = await request(app)
      .get('/api/v1/skills/taxonomy/tree')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    const pythonBasics = res.body.find(s => s.slug === 'python-basics');
    const pythonOop = res.body.find(s => s.slug === 'python-oop');

    expect(pythonBasics.is_unlocked).toBe(true);
    expect(pythonOop.is_unlocked).toBe(false); // Locked because prerequisites not yet mastered
  });

  // 5. Assessments & Adaptive Engine Scoring
  test('POST /api/v1/assessments/:id/start - Starts attempt and strips correct answers', async () => {
    const res = await request(app)
      .post(`/api/v1/assessments/${testAssessmentId}/start`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.attempt_id).toBeDefined();
    expect(res.body.questions.length).toBe(1);
    expect(res.body.questions[0].correct_answer_json).toBeUndefined(); // Answer key is stripped!
  });

  test('POST /api/v1/assessments/attempts/:id/submit - Grades server-side & updates mastery', async () => {
    // Start session
    const startRes = await request(app)
      .post(`/api/v1/assessments/${testAssessmentId}/start`)
      .set('Authorization', `Bearer ${studentToken}`);

    const attemptId = startRes.body.attempt_id;

    // Submit correct answer
    const submitRes = await request(app)
      .post(`/api/v1/assessments/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        responses: [
          {
            question_id: 1,
            selected_option: 'def',
            time_spent_seconds: 25,
          },
        ],
      });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.score_achieved).toBe(100.0);
    expect(submitRes.body.is_passed).toBe(true);
    expect(submitRes.body.questions_breakdown[0].is_correct).toBe(true);
  });

  test('GET /api/v1/adaptive/overview - Reflects updated learner mastery metrics', async () => {
    const res = await request(app)
      .get('/api/v1/adaptive/overview')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total_skills).toBeGreaterThanOrEqual(2);
    expect(res.body.mastered_count).toBeGreaterThanOrEqual(1);
  });

  // 6. Careers, Gap Analysis & Roadmaps
  test('GET /api/v1/careers - Catalog of career paths', async () => {
    const res = await request(app).get('/api/v1/careers');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/v1/careers/:slug/gap-analysis - Computes readiness and gap items', async () => {
    const res = await request(app)
      .get(`/api/v1/careers/${testCareerSlug}/gap-analysis`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.career_slug).toBe(testCareerSlug);
    expect(res.body.readiness_percentage).toBeDefined();
    expect(res.body.disclaimer).toBeDefined();
  });

  test('POST /api/v1/careers/:slug/generate-roadmap - Generates 90-day milestone schedule', async () => {
    const res = await request(app)
      .post(`/api/v1/careers/${testCareerSlug}/generate-roadmap`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ plan_type: '90_day' });

    expect(res.status).toBe(200);
    expect(res.body.plan_type).toBe('90_day');
    expect(res.body.milestones.length).toBe(6);
  });

  // 7. Projects
  test('GET /api/v1/projects - Lists project templates', async () => {
    const res = await request(app).get('/api/v1/projects');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  test('POST /api/v1/projects/:id/progress - Enroll and update project progress', async () => {
    const res = await request(app)
      .post('/api/v1/projects/1/progress')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        status: 'in_progress',
        completion_percentage: 50.0,
        evidence_notes: 'Repository initialized with git commit.',
      });

    expect(res.status).toBe(200);
    expect(res.body.completion_percentage).toBe(50.0);
  });

  // 8. AI Tutor & Coding Sandbox
  test('GET /api/v1/tutor/status - Operational status with deterministic fallback', async () => {
    const res = await request(app)
      .get('/api/v1/tutor/status')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.fallback_available).toBe(true);
  });

  test('POST /api/v1/tutor/query - Direct tutor query with pedagogical response', async () => {
    const res = await request(app)
      .post('/api/v1/tutor/query')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ prompt: 'Explain Python dynamic typing' });

    expect(res.status).toBe(200);
    expect(res.body.content).toContain('Python');
    expect(res.body.is_fallback).toBe(true);
  });

  test('POST /api/v1/coding/problems/:id/submit - Flags unauthorized modules via AST security scanner', async () => {
    const dangerousCode = 'import os\nimport sys\ndef hello():\n    os.system("rm -rf")\n    return "hi"';
    const res = await request(app)
      .post(`/api/v1/coding/problems/${testProblemId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ submitted_code: dangerousCode });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('security_violation');
    expect(res.body.static_analysis_feedback_json.error).toContain('Security Policy Violation');
  });

  test('POST /api/v1/coding/problems/:id/submit - Accepts safe algorithmic function', async () => {
    const safeCode = 'def hello():\n    return "hello"';
    const res = await request(app)
      .post(`/api/v1/coding/problems/${testProblemId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ submitted_code: safeCode });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('passed');
    expect(res.body.tests_passed).toBe(1);
  });

  // 9. Role-Based Access Control (RBAC)
  test('GET /api/v1/admin/users - Student receives 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.detail).toContain('Administrative privileges required');
  });

  test('GET /api/v1/admin/users - Admin permitted access', async () => {
    // Create admin user
    const admin = await User.create({
      email: 'admin_test@skillbridge.ai',
      hashed_password: 'hash',
      full_name: 'Admin Tester',
      role: 'admin',
      is_active: true,
    });
    adminId = admin.id;

    const { createAccessToken } = await import('../src/middleware/auth.js');
    adminToken = createAccessToken(admin.id, admin.role);

    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  // 10. Auth Parity & Input Validation
  test('GET /api/v1/auth/me - Returns authenticated user profile matching /users/me', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(studentId);
    expect(res.body.email).toBe('student_tester@skillbridge.ai');
  });

  // 11. Coding Sandbox Malicious Escape & Infinite Loop Tests
  test('POST /api/v1/coding/problems/:id/submit - Blocks unicode escape / prototype bypass', async () => {
    const malicious = 'def hack():\n    x = [].\\u0063onstructor\n    return x';
    const res = await request(app)
      .post(`/api/v1/coding/problems/${testProblemId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ submitted_code: malicious });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('security_violation');
  });

  test('POST /api/v1/coding/problems/:id/submit - Detects infinite loop safely as time_limit_exceeded', async () => {
    const infiniteLoop = 'def loop_forever():\n    while True:\n        x = 1';
    const res = await request(app)
      .post(`/api/v1/coding/problems/${testProblemId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ submitted_code: infiniteLoop });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('time_limit_exceeded');
    expect(res.body.static_analysis_feedback_json.error).toContain('Time Limit');
  });

  // 12. Flutter Quiz Payload Parity & Unanswered Scoring Accuracy
  test('POST /api/v1/assessments/attempts/:id/submit - Supports Flutter learner_response_json & grades all questions', async () => {
    await Question.create({
      assessment_id: testAssessmentId,
      prompt: 'Which symbol begins a Python comment?',
      options_json: ['//', '#', '/*', '--'],
      correct_answer_json: '#',
      points: 10,
    });

    const startRes = await request(app)
      .post(`/api/v1/assessments/${testAssessmentId}/start`)
      .set('Authorization', `Bearer ${studentToken}`);

    const attemptId = startRes.body.attempt_id;
    const q1Id = startRes.body.questions[0].id;

    // Submit only 1 of 2 questions using Flutter key `learner_response_json`
    const submitRes = await request(app)
      .post(`/api/v1/assessments/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        responses: [
          { question_id: q1Id, learner_response_json: 'def', time_spent_seconds: 12 },
        ],
      });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.score_achieved).toBe(50.0); // 10 of 20 points total
    expect(submitRes.body.total_points_earned).toBe(10);
    expect(submitRes.body.total_points_possible).toBe(20);
    expect(submitRes.body.question_results.length).toBe(2);
  });

  // 13. RAG Upload, Detail with Chunks & Grounded Query
  test('POST /api/v1/rag/documents/upload & query - Indexes document and returns citations', async () => {
    const uploadRes = await request(app)
      .post('/api/v1/rag/documents/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('title', 'Adaptive Graph Guide')
      .attach('file', Buffer.from('Directed acyclic graphs enforce prerequisite mastery before unlocking advanced topics.'), 'dag_guide.txt');

    expect(uploadRes.status).toBe(200);
    const docId = uploadRes.body.document_id;

    const detailRes = await request(app)
      .get(`/api/v1/rag/documents/${docId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(detailRes.status).toBe(200);
    expect(Array.isArray(detailRes.body.chunks)).toBe(true);
    expect(detailRes.body.chunks.length).toBeGreaterThanOrEqual(1);

    const queryRes = await request(app)
      .post('/api/v1/rag/query')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ query: 'directed acyclic graphs prerequisite mastery' });
    expect(queryRes.status).toBe(200);
    expect(queryRes.body.evidence_sufficient).toBe(true);
    expect(queryRes.body.sources.length).toBeGreaterThanOrEqual(1);
  });

  // 14. Admin Analytics Parity (Flat + Nested Metrics) & Feedback Acceptance
  test('GET /api/v1/admin/analytics - Returns both flat and structured Flutter Admin metrics', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total_users).toBeGreaterThanOrEqual(2);
    expect(res.body.user_metrics).toBeDefined();
    expect(res.body.assessment_metrics).toBeDefined();
    expect(res.body.skill_metrics).toBeDefined();
    expect(res.body.content_metrics).toBeDefined();
    expect(res.body.ai_metrics).toBeDefined();
  });

  // 15. Quiz Options Delivery & Duplicate Submission Guard
  test('POST /api/v1/assessments/:id/start returns both options & options_json and rejects duplicate submit', async () => {
    const startRes = await request(app)
      .post(`/api/v1/assessments/${testAssessmentId}/start`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(startRes.status).toBe(200);
    expect(startRes.body.questions.length).toBeGreaterThanOrEqual(1);
    const firstQ = startRes.body.questions[0];
    expect(Array.isArray(firstQ.options)).toBe(true);
    expect(Array.isArray(firstQ.options_json)).toBe(true);
    expect(firstQ.options.length).toBeGreaterThanOrEqual(2);
    expect(firstQ.options_json).toEqual(firstQ.options);

    const attemptId = startRes.body.attempt_id;
    const submit1 = await request(app)
      .post(`/api/v1/assessments/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ responses: [{ question_id: firstQ.id, learner_response_json: firstQ.options[1] }] });
    expect(submit1.status).toBe(200);
    expect(submit1.body.correct_count).toBeDefined();
    expect(submit1.body.incorrect_count).toBeDefined();

    // Re-submitting the same attempt must be rejected
    const submit2 = await request(app)
      .post(`/api/v1/assessments/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ responses: [{ question_id: firstQ.id, learner_response_json: firstQ.options[1] }] });
    expect(submit2.status).toBe(400);
  });

  // 16. Course Unlocking, Enrollment, Lesson Completion & Persistence
  test('GET/POST /api/v1/courses - All courses unlocked by default and track lesson progress in MongoDB', async () => {
    const listRes = await request(app)
      .get('/api/v1/courses')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBeGreaterThanOrEqual(1);
    expect(listRes.body[0].is_unlocked).toBe(true);
    expect(listRes.body[0].is_locked).toBe(false);

    const courseId = listRes.body[0].id;
    const enrollRes = await request(app)
      .post(`/api/v1/courses/${courseId}/enroll`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(enrollRes.status).toBe(200);
    expect(enrollRes.body.is_enrolled).toBe(true);
    expect(enrollRes.body.modules.length).toBeGreaterThanOrEqual(1);

    const lessonRes = await request(app)
      .post(`/api/v1/courses/${courseId}/lessons/py-l1/complete`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ completed: true });
    expect(lessonRes.status).toBe(200);
    expect(lessonRes.body.completion_percentage).toBe(50);
    expect(lessonRes.body.completed_lessons_count).toBe(1);
  });

  // 17. Dashboard Performance & User Data Isolation
  test('GET /api/v1/adaptive/overview - Tracks user metrics and isolates different users', async () => {
    const ov1 = await request(app)
      .get('/api/v1/adaptive/overview')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(ov1.status).toBe(200);
    expect(ov1.body.enrolled_courses_count).toBeGreaterThanOrEqual(1);
    expect(ov1.body.total_quizzes_attempted).toBeGreaterThanOrEqual(1);
    expect(ov1.body.recent_quiz_results.length).toBeGreaterThanOrEqual(1);
    expect(ov1.body.course_progress_summary.length).toBeGreaterThanOrEqual(1);

    // Register isolated second learner and ensure zero leakage
    const reg2 = await request(app).post('/api/v1/auth/register').send({
      email: 'isolated_learner@skillbridge.ai',
      password: 'SecurePassword123!',
      full_name: 'Isolated User',
    });
    expect(reg2.status).toBe(201);
    const ov2 = await request(app)
      .get('/api/v1/adaptive/overview')
      .set('Authorization', `Bearer ${reg2.body.access_token}`);
    expect(ov2.status).toBe(200);
    expect(ov2.body.enrolled_courses_count).toBe(0);
    expect(ov2.body.total_quizzes_attempted).toBe(0);
    expect(ov2.body.recent_quiz_results.length).toBe(0);
  });

  test('POST /api/v1/skills/unlock-all-100 - Unlocks and completes all skills and courses at 100%', async () => {
    const res = await request(app)
      .post('/api/v1/skills/unlock-all-100')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.mastery_percentage).toBe(100);

    const treeRes = await request(app)
      .get('/api/v1/skills/taxonomy/tree')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(treeRes.status).toBe(200);
    const pythonOop = treeRes.body.find(s => s.slug === 'python-oop');
    expect(pythonOop.is_unlocked).toBe(true);
    expect(pythonOop.mastery_score).toBe(1.0);
    expect(pythonOop.status).toBe('mastered');
  });

  // 6. Notification System Suite
  test('Notifications CRUD, Unread Count, and User Isolation', async () => {
    // 1. Create notification for student
    const createRes = await request(app)
      .post('/api/v1/notifications')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Welcome to SkillBridge AI',
        message: 'Your personal adaptive learning journey has begun!',
        type: 'welcome',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.id).toBeDefined();
    expect(createRes.body.is_read).toBe(false);
    const notifId = createRes.body.id;

    // 2. Fetch notifications
    const listRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.unread_count).toBeGreaterThanOrEqual(1);
    expect(listRes.body.items.some(n => n.id === notifId)).toBe(true);

    // 3. Fetch unread count
    const countRes = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(countRes.status).toBe(200);
    expect(countRes.body.unread_count).toBeGreaterThanOrEqual(1);

    // 4. User isolation check (other user cannot mark as read)
    const otherUserReg = await request(app).post('/api/v1/auth/register').send({
      email: 'notif_isolated_user@skillbridge.ai',
      password: 'SecurePassword123!',
      full_name: 'Isolated User Notif',
    });

    const unauthorizedRead = await request(app)
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${otherUserReg.body.access_token}`);

    expect(unauthorizedRead.status).toBe(404);

    // 5. Mark as read
    const markReadRes = await request(app)
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(markReadRes.status).toBe(200);
    expect(markReadRes.body.is_read).toBe(true);

    // 6. Mark all as read
    const markAllRes = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(markAllRes.status).toBe(200);

    // 7. Delete notification
    const deleteRes = await request(app)
      .delete(`/api/v1/notifications/${notifId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(deleteRes.status).toBe(200);
  });
});
