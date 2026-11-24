import { API_BASE_URL } from '../config.js';

class ApiClient {
  static getToken() {
    return localStorage.getItem('skillbridge_access_token');
  }

  static setTokens(accessToken, refreshToken) {
    if (accessToken) localStorage.setItem('skillbridge_access_token', accessToken);
    if (refreshToken) localStorage.setItem('skillbridge_refresh_token', refreshToken);
  }

  static clearTokens() {
    localStorage.removeItem('skillbridge_access_token');
    localStorage.removeItem('skillbridge_refresh_token');
  }

  static async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      ...(options.headers || {}),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const token = this.getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });

      // Handle 401 Unauthorized via single-flight refresh token retry before logging out
      if (response.status === 401 && !endpoint.includes('/auth/') && !options._isRetry) {
        const refreshTok = localStorage.getItem('skillbridge_refresh_token');
        if (refreshTok) {
          try {
            if (!this._refreshPromise) {
              this._refreshPromise = this.refreshToken().finally(() => {
                this._refreshPromise = null;
              });
            }
            await this._refreshPromise;
            const retryHeaders = { ...headers };
            const newToken = this.getToken();
            if (newToken) {
              retryHeaders['Authorization'] = `Bearer ${newToken}`;
            }
            return await this.request(endpoint, {
              ...options,
              headers: retryHeaders,
              _isRetry: true,
            });
          } catch {
            // Fall through to token clearing and unauthorized redirect event
          }
        }
        this.clearTokens();
        window.dispatchEvent(new Event('auth_unauthorized'));
      } else if (response.status === 401 && !endpoint.includes('/auth/')) {
        this.clearTokens();
        window.dispatchEvent(new Event('auth_unauthorized'));
      }

      if (options.responseType === 'blob') {
        if (!response.ok) throw new Error('File download failed');
        return await response.blob();
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(data.detail || data.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.detail = data.detail;
        throw error;
      }

      return data;
    } catch (err) {
      throw err;
    }
  }

  // ============================================================================
  // 1. Health
  // ============================================================================
  static checkHealth() {
    return this.request('/health');
  }

  // ============================================================================
  // 2. Authentication
  // ============================================================================
  static async register(data) {
    const res = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.access_token) {
      this.setTokens(res.access_token, res.refresh_token);
    }
    return res;
  }

  static async login(data) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.access_token) {
      this.setTokens(res.access_token, res.refresh_token);
    }
    return res;
  }

  static async refreshToken() {
    const refreshToken = localStorage.getItem('skillbridge_refresh_token');
    if (!refreshToken) throw new Error('No refresh token');
    const res = await this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (res.access_token) {
      this.setTokens(res.access_token, res.refresh_token);
    }
    return res;
  }

  static forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // ============================================================================
  // 3. User & Profile
  // ============================================================================
  static getMe() {
    return this.request('/users/me');
  }

  static updateMe(data) {
    return this.request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static updateProfile(data) {
    return this.request('/users/me/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static getUserById(id) {
    return this.request(`/users/${id}`);
  }

  // ============================================================================
  // 4. Skills Taxonomy & DAG
  // ============================================================================
  static listSkills(category = null) {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request(`/skills${query}`);
  }

  static getTaxonomyTree() {
    return this.request('/skills/taxonomy/tree');
  }

  static getMyMastery() {
    return this.request('/skills/my-mastery');
  }

  static getSkillBySlug(slug) {
    return this.request(`/skills/${slug}`);
  }

  // ============================================================================
  // 4B. Learning Courses, Modules & Lessons
  // ============================================================================
  static listCourses(category = null) {
    const query = category && category !== 'All' ? `?category=${encodeURIComponent(category)}` : '';
    return this.request(`/courses${query}`);
  }

  static getCourseDetail(courseIdOrSlug) {
    return this.request(`/courses/${courseIdOrSlug}`);
  }

  static enrollInCourse(courseIdOrSlug) {
    return this.request(`/courses/${courseIdOrSlug}/enroll`, { method: 'POST' });
  }

  static completeLesson(courseIdOrSlug, lessonId, completed = true) {
    return this.request(`/courses/${courseIdOrSlug}/lessons/${lessonId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ completed }),
    });
  }

  // ============================================================================
  // 5. Assessments
  // ============================================================================
  static listAssessments(skillId = null) {
    const query = skillId ? `?skill_id=${skillId}` : '';
    return this.request(`/assessments${query}`);
  }

  static startAssessment(assessmentId) {
    return this.request(`/assessments/${assessmentId}/start`, { method: 'POST' });
  }

  static submitAssessment(attemptId, responses) {
    return this.request(`/assessments/attempts/${attemptId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ responses }),
    });
  }

  static getAttemptDetails(attemptId) {
    return this.request(`/assessments/attempts/${attemptId}`);
  }

  static getAssessmentHistory() {
    return this.request('/assessments/my-history');
  }

  // ============================================================================
  // 6. Adaptive Learning Engine
  // ============================================================================
  static getNextActivity() {
    return this.request('/adaptive/next-activity');
  }

  static getWeakConcepts() {
    return this.request('/adaptive/weak-concepts');
  }

  static getMasteryOverview() {
    return this.request('/adaptive/overview');
  }

  static predictMastery(features) {
    return this.request('/adaptive/predict-mastery', {
      method: 'POST',
      body: JSON.stringify(features),
    });
  }

  // ============================================================================
  // 7. Careers & Roadmaps
  // ============================================================================
  static listCareers() {
    return this.request('/careers');
  }

  static getCareerDetails(slug) {
    return this.request(`/careers/${slug}`);
  }

  static getCareerGapAnalysis(slug) {
    return this.request(`/careers/${slug}/gap-analysis`);
  }

  static generateRoadmap(slug, planType = '90_day') {
    return this.request(`/careers/${slug}/generate-roadmap`, {
      method: 'POST',
      body: JSON.stringify({ plan_type: planType }),
    });
  }

  static getMyRoadmaps() {
    return this.request('/careers/my-roadmaps/all');
  }

  // ============================================================================
  // 8. Hands-On Projects
  // ============================================================================
  static listProjects() {
    return this.request('/projects');
  }

  static getProjectDetails(id) {
    return this.request(`/projects/${id}`);
  }

  static updateProjectProgress(id, data) {
    return this.request(`/projects/${id}/progress`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static getMyPortfolio() {
    return this.request('/projects/my-portfolio');
  }

  // ============================================================================
  // 9. AI Tutor & Learning Chat
  // ============================================================================
  static getTutorStatus() {
    return this.request('/tutor/status');
  }

  static queryTutor(prompt, skillContext = null) {
    return this.request('/tutor/query', {
      method: 'POST',
      body: JSON.stringify({ prompt, skill_context: skillContext }),
    });
  }

  static createConversation(title, topic = 'general') {
    return this.request('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({ title, topic }),
    });
  }

  static listConversations() {
    return this.request('/chat/conversations');
  }

  static getConversation(id) {
    return this.request(`/chat/conversations/${id}`);
  }

  static sendMessage(id, content, useRag = false) {
    return this.request(`/chat/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, use_rag: useRag }),
    });
  }

  static deleteConversation(id) {
    return this.request(`/chat/conversations/${id}`, { method: 'DELETE' });
  }

  // ============================================================================
  // 10. RAG Knowledge Pipeline
  // ============================================================================
  static uploadDocument(formData) {
    return this.request('/rag/documents/upload', {
      method: 'POST',
      body: formData,
    });
  }

  static listDocuments() {
    return this.request('/rag/documents');
  }

  static getDocumentDetail(id) {
    return this.request(`/rag/documents/${id}`);
  }

  static queryRAG(query) {
    return this.request('/rag/query', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  // ============================================================================
  // 11. Coding Practice
  // ============================================================================
  static listCodingProblems(skillSlug = null, difficulty = null) {
    const params = new URLSearchParams();
    if (skillSlug) params.append('skill_slug', skillSlug);
    if (difficulty) params.append('difficulty', difficulty);
    const q = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/coding/problems${q}`);
  }

  static getCodingProblem(slug) {
    return this.request(`/coding/problems/${slug}`);
  }

  static submitCodingSolution(id, submittedCode) {
    return this.request(`/coding/problems/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ submitted_code: submittedCode }),
    });
  }

  static getMyCodingSubmissions(problemId = null) {
    const q = problemId ? `?problem_id=${problemId}` : '';
    return this.request(`/coding/my-submissions${q}`);
  }

  static getCodingRecommendations() {
    return this.request('/coding/recommendations');
  }

  // ============================================================================
  // 12. Feedback
  // ============================================================================
  static submitFeedback(data) {
    return this.request('/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static getMyFeedback() {
    return this.request('/feedback/my-feedback');
  }

  // ============================================================================
  // 13. Admin Management
  // ============================================================================
  static getAdminUsers(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request(`/admin/users${q ? `?${q}` : ''}`);
  }

  static updateAdminUserStatus(id, isActive) {
    return this.request(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    });
  }

  static updateAdminUserRole(id, role) {
    return this.request(`/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  static createSkill(data) {
    return this.request('/admin/skills', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static deleteSkill(id) {
    return this.request(`/admin/skills/${id}`, { method: 'DELETE' });
  }

  static createAssessment(data) {
    return this.request('/admin/assessments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static deleteAssessment(id) {
    return this.request(`/admin/assessments/${id}`, { method: 'DELETE' });
  }

  static addQuestion(assessmentId, data) {
    return this.request(`/admin/assessments/${assessmentId}/questions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static createCareer(data) {
    return this.request('/admin/careers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static deleteCareer(id) {
    return this.request(`/admin/careers/${id}`, { method: 'DELETE' });
  }

  static createProject(data) {
    return this.request('/admin/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static deleteProject(id) {
    return this.request(`/admin/projects/${id}`, { method: 'DELETE' });
  }

  static getAdminDocuments() {
    return this.request('/admin/documents');
  }

  static setDocumentApproval(id, isApproved) {
    return this.request(`/admin/documents/${id}/approval`, {
      method: 'PATCH',
      body: JSON.stringify({ is_approved: isApproved }),
    });
  }

  static getAdminFeedback(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request(`/admin/feedback${q ? `?${q}` : ''}`);
  }

  static updateFeedbackStatus(id, status, adminNotes = null) {
    return this.request(`/admin/feedback/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, admin_notes: adminNotes }),
    });
  }

  static getAdminAnalytics() {
    return this.request('/admin/analytics');
  }

  static getAdminAuditLogs(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request(`/admin/audit-logs${q ? `?${q}` : ''}`);
  }

  static exportCsv(type) {
    const token = this.getToken();
    return `${API_BASE_URL}/admin/export/${type}.csv${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  }

  static async downloadCsv(type) {
    const blob = await this.request(`/admin/export/${type}.csv`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skillbridge_${type}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  // ============================================================================
  // 14. Notifications
  // ============================================================================
  static getNotifications(skip = 0, limit = 20) {
    return this.request(`/notifications?skip=${skip}&limit=${limit}`);
  }

  static getUnreadNotificationCount() {
    return this.request('/notifications/unread-count');
  }

  static markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  static markAllNotificationsRead() {
    return this.request('/notifications/read-all', { method: 'PATCH' });
  }

  static deleteNotification(id) {
    return this.request(`/notifications/${id}`, { method: 'DELETE' });
  }
}

export default ApiClient;
