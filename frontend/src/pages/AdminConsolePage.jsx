import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ApiClient from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';

export default function AdminConsolePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'users', 'skills', 'assessments', 'careers_projects', 'rag', 'feedback', 'audit'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Data states
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [careers, setCareers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Form states
  const [skillForm, setSkillForm] = useState({ name: '', slug: '', category: 'programming', difficulty_level: 'intermediate', description: '' });
  const [assessmentForm, setAssessmentForm] = useState({ title: '', skill_id: '', description: '', time_limit_minutes: 30, passing_score_pct: 70 });
  const [questionForm, setQuestionForm] = useState({ assessment_id: '', question_text: '', question_type: 'single_choice', options_str: '', correct_answer: '', points: 10 });
  const [careerForm, setCareerForm] = useState({ title: '', slug: '', description: '', average_salary_range: '$110,000 - $160,000', industry: 'Technology' });
  const [projectForm, setProjectForm] = useState({ title: '', description: '', career_id: '', difficulty: 'intermediate' });
  const [feedbackResolve, setFeedbackResolve] = useState({ id: null, status: 'resolved', admin_notes: '' });

  const isAdmin = user && (user.role === 'admin' || user.role === 'superadmin');

  useEffect(() => {
    if (isAdmin) {
      loadTabData(activeTab);
    }
  }, [activeTab, isAdmin]);

  const loadTabData = async (tab) => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'analytics') {
        const data = await ApiClient.getAdminAnalytics();
        setAnalytics(data);
      } else if (tab === 'users') {
        const data = await ApiClient.getAdminUsers();
        setUsers(Array.isArray(data) ? data : (data.items || data.users || []));
      } else if (tab === 'skills') {
        const data = await ApiClient.listSkills();
        setSkills(Array.isArray(data) ? data : (data.items || data.skills || []));
      } else if (tab === 'assessments') {
        const [aData, sData] = await Promise.all([ApiClient.listAssessments(), ApiClient.listSkills()]);
        setAssessments(Array.isArray(aData) ? aData : (aData.items || aData.assessments || []));
        setSkills(Array.isArray(sData) ? sData : (sData.items || sData.skills || []));
      } else if (tab === 'careers_projects') {
        const [cData, pData] = await Promise.all([ApiClient.listCareers(), ApiClient.listProjects()]);
        setCareers(Array.isArray(cData) ? cData : (cData.items || cData.careers || []));
        setProjects(Array.isArray(pData) ? pData : (pData.items || pData.projects || []));
      } else if (tab === 'rag') {
        const data = await ApiClient.getAdminDocuments();
        setDocuments(Array.isArray(data) ? data : (data.items || data.documents || []));
      } else if (tab === 'feedback') {
        const data = await ApiClient.getAdminFeedback();
        setFeedback(Array.isArray(data) ? data : (data.items || data.feedback || []));
      } else if (tab === 'audit') {
        const data = await ApiClient.getAdminAuditLogs();
        setAuditLogs(Array.isArray(data) ? data : (data.items || data.audit_logs || []));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // User Actions
  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      await ApiClient.updateAdminUserStatus(userId, !currentStatus);
      setSuccess('User active state toggled successfully');
      loadTabData('users');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChangeUserRole = async (userId, newRole) => {
    try {
      await ApiClient.updateAdminUserRole(userId, newRole);
      setSuccess('User role updated');
      loadTabData('users');
    } catch (err) {
      setError(err.message);
    }
  };

  // Skill Actions
  const handleCreateSkill = async (e) => {
    e.preventDefault();
    try {
      await ApiClient.createSkill({
        ...skillForm,
        title: skillForm.name.trim(),
      });
      setSuccess(`Skill "${skillForm.name}" created successfully`);
      setSkillForm({ name: '', slug: '', category: 'programming', difficulty_level: 'intermediate', description: '' });
      loadTabData('skills');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteSkill = async (id) => {
    if (!confirm('Are you sure you want to delete this skill?')) return;
    try {
      await ApiClient.deleteSkill(id);
      setSuccess('Skill deleted');
      loadTabData('skills');
    } catch (err) {
      setError(err.message);
    }
  };

  // Assessment Actions
  const handleCreateAssessment = async (e) => {
    e.preventDefault();
    try {
      await ApiClient.createAssessment({
        ...assessmentForm,
        skill_id: Number(assessmentForm.skill_id),
        pass_percentage: Number(assessmentForm.passing_score_pct),
      });
      setSuccess('Assessment created successfully');
      setAssessmentForm({ title: '', skill_id: '', description: '', time_limit_minutes: 30, passing_score_pct: 70 });
      loadTabData('assessments');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteAssessment = async (id) => {
    if (!confirm('Are you sure you want to delete this assessment and its questions?')) return;
    try {
      await ApiClient.deleteAssessment(id);
      setSuccess('Assessment deleted');
      loadTabData('assessments');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    try {
      const options = questionForm.options_str
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      await ApiClient.addQuestion(questionForm.assessment_id, {
        prompt: questionForm.question_text,
        question_text: questionForm.question_text,
        question_type: questionForm.question_type || 'single_choice',
        options_json: options,
        options,
        correct_answer_json: questionForm.correct_answer,
        correct_answer: questionForm.correct_answer,
        points: Number(questionForm.points)
      });
      setSuccess('Question added to assessment');
      setQuestionForm({ assessment_id: questionForm.assessment_id, question_text: '', question_type: 'single_choice', options_str: '', correct_answer: '', points: 10 });
      loadTabData('assessments');
    } catch (err) {
      setError(err.message);
    }
  };

  // Careers & Projects Actions
  const handleCreateCareer = async (e) => {
    e.preventDefault();
    try {
      await ApiClient.createCareer(careerForm);
      setSuccess(`Career "${careerForm.title}" created successfully`);
      setCareerForm({ title: '', slug: '', description: '', average_salary_range: '$110,000 - $160,000', industry: 'Technology' });
      loadTabData('careers_projects');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCareer = async (id) => {
    if (!confirm('Are you sure you want to delete this career path?')) return;
    try {
      await ApiClient.deleteCareer(id);
      setSuccess('Career path deleted');
      loadTabData('careers_projects');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      await ApiClient.createProject({
        title: projectForm.title.trim(),
        description: projectForm.description.trim(),
        difficulty: projectForm.difficulty,
        career_id: projectForm.career_id ? Number(projectForm.career_id) : null,
      });
      setSuccess(`Project "${projectForm.title}" created successfully`);
      setProjectForm({ title: '', description: '', career_id: '', difficulty: 'intermediate' });
      loadTabData('careers_projects');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteProject = async (id) => {
    if (!confirm('Are you sure you want to delete this project template?')) return;
    try {
      await ApiClient.deleteProject(id);
      setSuccess('Project template deleted');
      loadTabData('careers_projects');
    } catch (err) {
      setError(err.message);
    }
  };

  // RAG Document Actions
  const handleToggleDocApproval = async (docId, currentApproval) => {
    try {
      await ApiClient.setDocumentApproval(docId, !currentApproval);
      setSuccess(`Document approval state updated to ${!currentApproval}`);
      loadTabData('rag');
    } catch (err) {
      setError(err.message);
    }
  };

  // Feedback Actions
  const handleResolveFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackResolve.id) return;
    try {
      await ApiClient.updateFeedbackStatus(feedbackResolve.id, feedbackResolve.status, feedbackResolve.admin_notes);
      setSuccess('Feedback status updated');
      setFeedbackResolve({ id: null, status: 'resolved', admin_notes: '' });
      loadTabData('feedback');
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isAdmin) {
    return (
      <div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="glass-panel" style={{ maxWidth: '520px', margin: '0 auto', padding: '40px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
          <h2>Restricted Administrative Console</h2>
          <p className="text-muted" style={{ margin: '14px 0 24px 0', fontSize: '0.92rem' }}>
            Access to this console requires role permissions of <strong>admin</strong> or <strong>superadmin</strong>.
          </p>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Signed in as: <strong>{user?.email || 'Guest'}</strong> (Role: {user?.role || 'student'})
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'analytics', label: 'Platform Analytics' },
    { key: 'users', label: 'User Governance' },
    { key: 'skills', label: 'Taxonomy & DAG' },
    { key: 'assessments', label: 'Assessments' },
    { key: 'careers_projects', label: 'Careers & Projects' },
    { key: 'rag', label: 'RAG Knowledge Base' },
    { key: 'feedback', label: 'Feedback Inquiries' },
    { key: 'audit', label: 'Audit Stream' }
  ];

  return (
    <div className="container" style={{ padding: '30px 20px', minHeight: '85vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="text-gradient" style={{ margin: 0, fontSize: '2rem' }}>Administrative Console</h1>
            <span className="badge badge-accent">Role: {user.role}</span>
          </div>
          <p className="text-muted" style={{ margin: '6px 0 0 0' }}>
            Full system control, content management, user governance, vector index oversight, and CSV exports.
          </p>
        </div>

        {/* CSV Export Links */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => ApiClient.downloadCsv('users')}
            className="btn btn-outline"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            Export Users CSV
          </button>
          <button
            onClick={() => ApiClient.downloadCsv('assessment-attempts')}
            className="btn btn-outline"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            Export Assessments CSV
          </button>
          <button
            onClick={() => ApiClient.downloadCsv('audit-logs')}
            className="btn btn-outline"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            Export Audit CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '24px', overflowX: 'auto' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`btn ${activeTab === t.key ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      {error && (
        <div style={{ padding: '12px 18px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--accent-red)', color: '#f87171', marginBottom: '20px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '12px 18px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--accent-green)', color: '#34d399', marginBottom: '20px', fontSize: '0.9rem' }}>
          {success}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="text-center text-muted" style={{ padding: '50px 0' }}>
          <span className="spinner" style={{ marginRight: '10px' }}></span>
          Loading administrative data...
        </div>
      ) : (
        <>
          {/* TAB 1: ANALYTICS */}
          {activeTab === 'analytics' && analytics && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Registered Accounts</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 700, marginTop: '8px', color: '#60a5fa' }}>
                    {analytics.total_users ?? analytics.user_metrics?.total_users ?? 0}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Active: {analytics.active_users ?? analytics.user_metrics?.active_users ?? 0}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Taxonomy Skills</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 700, marginTop: '8px', color: '#34d399' }}>
                    {analytics.total_skills ?? analytics.skill_metrics?.total_skills ?? 0}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Curriculum nodes active
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Assessment Attempts</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 700, marginTop: '8px', color: '#a78bfa' }}>
                    {analytics.total_assessments_taken ?? analytics.assessment_metrics?.total_attempts ?? 0}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Average Score: {analytics.average_score_pct != null ? `${Math.round(analytics.average_score_pct)}%` : '0%'}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Vetted Knowledge Docs</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 700, marginTop: '8px', color: '#f59e0b' }}>
                    {analytics.total_documents ?? analytics.content_metrics?.total_documents ?? 0}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Indexed for RAG vector retrieval
                  </div>
                </div>
              </div>

              {/* Subsystems Health Card */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Platform Subsystem Health</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Database Layer</div>
                    <div style={{ fontWeight: 600, color: 'var(--accent-green)', marginTop: '4px' }}>MongoDB / Mongoose Connected</div>
                  </div>
                  <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Adaptive Engine</div>
                    <div style={{ fontWeight: 600, color: 'var(--accent-green)', marginTop: '4px' }}>Bayesian EMA Online</div>
                  </div>
                  <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Code Sandbox</div>
                    <div style={{ fontWeight: 600, color: 'var(--accent-green)', marginTop: '4px' }}>AST Static Validator Active</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USERS */}
          {activeTab === 'users' && (
            <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
              <h3 style={{ marginTop: 0, marginBottom: '18px' }}>User Accounts ({users.length})</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 8px' }}>Name / Email</th>
                    <th style={{ padding: '12px 8px' }}>Role</th>
                    <th style={{ padding: '12px 8px' }}>Status</th>
                    <th style={{ padding: '12px 8px' }}>Joined</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const uId = u.id || u._id;
                    return (
                      <tr key={uId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ fontWeight: 600 }}>{u.full_name || 'Anonymous User'}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email}</div>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <select
                            value={u.role}
                            onChange={(e) => handleChangeUserRole(uId, e.target.value)}
                            className="input-control"
                            style={{ padding: '4px 8px', fontSize: '0.82rem', width: 'auto' }}
                          >
                            <option value="student">student</option>
                            <option value="instructor">instructor</option>
                            <option value="admin">admin</option>
                            <option value="superadmin">superadmin</option>
                          </select>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                            {u.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {new Date(u.created_at || Date.now()).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                            onClick={() => handleToggleUserStatus(uId, u.is_active)}
                          >
                            {u.is_active ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: SKILLS */}
          {activeTab === 'skills' && (
            <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px' }}>
              {/* Form to create skill */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Add New Curriculum Skill</h3>
                <form onSubmit={handleCreateSkill} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', color: 'var(--text-muted)' }}>Skill Name</label>
                    <input
                      type="text"
                      className="input-control"
                      placeholder="e.g. GraphQL Federation"
                      value={skillForm.name}
                      onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', color: 'var(--text-muted)' }}>Slug</label>
                    <input
                      type="text"
                      className="input-control"
                      value={skillForm.slug}
                      onChange={(e) => setSkillForm({ ...skillForm, slug: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', color: 'var(--text-muted)' }}>Category</label>
                    <select
                      className="input-control"
                      value={skillForm.category}
                      onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value })}
                    >
                      <option value="programming">Programming</option>
                      <option value="machine_learning">Machine Learning</option>
                      <option value="data_engineering">Data Engineering</option>
                      <option value="cloud_devops">Cloud & DevOps</option>
                      <option value="security">Security</option>
                      <option value="web_development">Web Development</option>
                      <option value="databases">Databases</option>
                      <option value="fundamentals">Fundamentals</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', color: 'var(--text-muted)' }}>Difficulty Level</label>
                    <select
                      className="input-control"
                      value={skillForm.difficulty_level}
                      onChange={(e) => setSkillForm({ ...skillForm, difficulty_level: e.target.value })}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', color: 'var(--text-muted)' }}>Description</label>
                    <textarea
                      className="input-control"
                      rows={3}
                      placeholder="Key learning outcomes..."
                      value={skillForm.description}
                      onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
                    Save Skill Node
                  </button>
                </form>
              </div>

              {/* Skill list */}
              <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Registered Skills ({skills.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {skills.map((s) => (
                    <div
                      key={s.id || s._id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{s.title || s.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Slug: <code>{s.slug}</code> &bull; Category: {s.category} &bull; Difficulty: {s.difficulty_level}
                        </div>
                      </div>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#f87171' }}
                        onClick={() => handleDeleteSkill(s.id || s._id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ASSESSMENTS */}
          {activeTab === 'assessments' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Create Assessment Form */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Create Assessment</h3>
                <form onSubmit={handleCreateAssessment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', color: 'var(--text-muted)' }}>Associated Skill</label>
                    <select
                      className="input-control"
                      value={assessmentForm.skill_id}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, skill_id: e.target.value })}
                      required
                    >
                      <option value="">Select skill...</option>
                      {skills.map((s) => (
                        <option key={s.id || s._id} value={s.id || s._id}>
                          {s.title || s.name} ({s.slug})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', color: 'var(--text-muted)' }}>Assessment Title</label>
                    <input
                      type="text"
                      className="input-control"
                      placeholder="e.g. Advanced Docker & Container Security"
                      value={assessmentForm.title}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', color: 'var(--text-muted)' }}>Time Limit (mins)</label>
                      <input
                        type="number"
                        className="input-control"
                        value={assessmentForm.time_limit_minutes}
                        onChange={(e) => setAssessmentForm({ ...assessmentForm, time_limit_minutes: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', color: 'var(--text-muted)' }}>Passing Score (%)</label>
                      <input
                        type="number"
                        className="input-control"
                        value={assessmentForm.passing_score_pct}
                        onChange={(e) => setAssessmentForm({ ...assessmentForm, passing_score_pct: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', color: 'var(--text-muted)' }}>Description</label>
                    <textarea
                      className="input-control"
                      rows={2}
                      value={assessmentForm.description}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, description: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    Create Assessment Suite
                  </button>
                </form>
              </div>

              {/* Add Question Form */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Add Question to Assessment</h3>
                <form onSubmit={handleAddQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', color: 'var(--text-muted)' }}>Target Assessment</label>
                    <select
                      className="input-control"
                      value={questionForm.assessment_id}
                      onChange={(e) => setQuestionForm({ ...questionForm, assessment_id: e.target.value })}
                      required
                    >
                      <option value="">Select assessment...</option>
                      {assessments.map((a) => (
                        <option key={a.id || a._id} value={a.id || a._id}>
                          {a.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', color: 'var(--text-muted)' }}>Question Text</label>
                    <textarea
                      className="input-control"
                      rows={2}
                      placeholder="e.g. Which Docker instruction defines the default command executed in the container?"
                      value={questionForm.question_text}
                      onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', color: 'var(--text-muted)' }}>
                      Options (one per line)
                    </label>
                    <textarea
                      className="input-control"
                      rows={4}
                      placeholder="RUN&#10;ENTRYPOINT&#10;CMD&#10;ENV"
                      value={questionForm.options_str}
                      onChange={(e) => setQuestionForm({ ...questionForm, options_str: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', color: 'var(--text-muted)' }}>Correct Answer</label>
                    <input
                      type="text"
                      className="input-control"
                      placeholder="e.g. CMD"
                      value={questionForm.correct_answer}
                      onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    Add Question
                  </button>
                </form>
              </div>

              {/* Existing Assessments List */}
              <div className="glass-panel" style={{ padding: '24px', gridColumn: '1 / -1' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Registered Assessments ({assessments.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {assessments.map((a) => (
                    <div
                      key={a.id || a._id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{a.title}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          ID: #{a.id} &bull; Skill ID: {a.skill_id} &bull; Pass: {a.pass_percentage ?? 70}%
                        </div>
                      </div>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#f87171' }}
                        onClick={() => handleDeleteAssessment(a.id || a._id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4B: CAREERS & PROJECTS */}
          {activeTab === 'careers_projects' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Create Career Pathway</h3>
                <form onSubmit={handleCreateCareer} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Career Title (e.g. MLOps Engineer)"
                    value={careerForm.title}
                    onChange={(e) => setCareerForm({ ...careerForm, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') })}
                    required
                  />
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Slug (e.g. mlops-engineer)"
                    value={careerForm.slug}
                    onChange={(e) => setCareerForm({ ...careerForm, slug: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Average Salary Range"
                    value={careerForm.average_salary_range}
                    onChange={(e) => setCareerForm({ ...careerForm, average_salary_range: e.target.value })}
                  />
                  <textarea
                    className="input-control"
                    rows={2}
                    placeholder="Career summary..."
                    value={careerForm.description}
                    onChange={(e) => setCareerForm({ ...careerForm, description: e.target.value })}
                  />
                  <button type="submit" className="btn btn-primary">Save Career Path</button>
                </form>

                <h4 style={{ marginBottom: '10px' }}>Registered Careers ({careers.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {careers.map((c) => (
                    <div
                      key={c.id || c._id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Slug: {c.slug}</div>
                      </div>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '4px 10px', fontSize: '0.76rem', color: '#f87171' }}
                        onClick={() => handleDeleteCareer(c.id || c._id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Create Capstone Project</h3>
                <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Project Title"
                    value={projectForm.title}
                    onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                    required
                  />
                  <select
                    className="input-control"
                    value={projectForm.difficulty}
                    onChange={(e) => setProjectForm({ ...projectForm, difficulty: e.target.value })}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                  <select
                    className="input-control"
                    value={projectForm.career_id}
                    onChange={(e) => setProjectForm({ ...projectForm, career_id: e.target.value })}
                  >
                    <option value="">Optional: Link Career Pathway</option>
                    {careers.map((c) => (
                      <option key={c.id || c._id} value={c.id || c._id}>{c.title}</option>
                    ))}
                  </select>
                  <textarea
                    className="input-control"
                    rows={2}
                    placeholder="Project specification & rubric goals..."
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    required
                  />
                  <button type="submit" className="btn btn-primary">Save Project Template</button>
                </form>

                <h4 style={{ marginBottom: '10px' }}>Registered Projects ({projects.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {projects.map((p) => (
                    <div
                      key={p.id || p._id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Difficulty: {p.difficulty}</div>
                      </div>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '4px 10px', fontSize: '0.76rem', color: '#f87171' }}
                        onClick={() => handleDeleteProject(p.id || p._id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: RAG DOCUMENTS */}
          {activeTab === 'rag' && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Curriculum Knowledge Base & Documents ({documents.length})</h3>
              <p className="text-muted" style={{ fontSize: '0.88rem', marginBottom: '20px' }}>
                Approved documents are automatically segmented, embedded, and injected into the AI Tutor context for grounded retrieval.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {documents.map((doc) => {
                  const docId = doc.id || doc._id;
                  return (
                    <div
                      key={docId}
                      style={{
                        padding: '16px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{doc.title || doc.filename}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          File: {doc.filename} &bull; Chunks: {doc.chunk_count || 1} &bull; Uploaded: {new Date(doc.created_at || Date.now()).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className={`badge ${doc.is_approved ? 'badge-success' : 'badge-warning'}`}>
                          {doc.is_approved ? 'Approved for RAG' : 'Pending Verification'}
                        </span>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => handleToggleDocApproval(docId, doc.is_approved)}
                        >
                          {doc.is_approved ? 'Revoke Approval' : 'Approve for RAG'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: FEEDBACK QUEUE */}
          {activeTab === 'feedback' && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Learner Feedback Submissions ({feedback.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {feedback.map((f) => {
                  const fId = f.id || f._id;
                  const isResolving = feedbackResolve.id === fId;
                  return (
                    <div
                      key={fId}
                      style={{
                        padding: '16px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{f.title || f.subject}</span>
                          <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: '12px' }}>
                            {f.rating != null ? `Rating: ${f.rating}/5 • ` : ''}Category: {f.category} &bull; User ID: {f.user_id}
                          </span>
                        </div>
                        <StatusBadge status={f.status || 'pending'} />
                      </div>
                      <p style={{ margin: '8px 0', fontSize: '0.88rem', color: 'var(--text-light)' }}>
                        {f.message}
                      </p>

                      {isResolving ? (
                        <form onSubmit={handleResolveFeedback} style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input
                            type="text"
                            className="input-control"
                            placeholder="Add administrative resolution note..."
                            value={feedbackResolve.admin_notes}
                            onChange={(e) => setFeedbackResolve({ ...feedbackResolve, admin_notes: e.target.value })}
                            required
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="submit" className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '0.8rem' }}>
                              Save Status (Resolved)
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                              onClick={() => setFeedbackResolve({ id: null, status: 'resolved', admin_notes: '' })}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                            onClick={() => setFeedbackResolve({ id: fId, status: 'resolved', admin_notes: f.admin_notes || '' })}
                          >
                            Update Status / Reply
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 7: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
              <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Security & Audit Stream ({auditLogs.length})</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 8px' }}>Timestamp</th>
                    <th style={{ padding: '10px 8px' }}>Action</th>
                    <th style={{ padding: '10px 8px' }}>Resource</th>
                    <th style={{ padding: '10px 8px' }}>Actor</th>
                    <th style={{ padding: '10px 8px' }}>IP / Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>
                        {new Date(log.created_at || Date.now()).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 8px', fontWeight: 600 }}>{log.action}</td>
                      <td style={{ padding: '10px 8px' }}>{log.entity_type || log.resource_type || log.resource}</td>
                      <td style={{ padding: '10px 8px' }}>{log.admin_email || (log.admin_id ? `Admin #${log.admin_id}` : (log.user_id ? `User #${log.user_id}` : 'System'))}</td>
                      <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>{log.ip_address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
