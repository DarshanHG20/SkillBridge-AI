import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ApiClient from '../services/api.js';
import { StatusBadge, ProgressBar } from '../components/StatusBadge.jsx';
import {
  Sparkles,
  Trophy,
  Activity,
  AlertTriangle,
  ArrowRight,
  Compass,
  Code2,
  Bot,
  BrainCircuit,
  RefreshCw,
  BookOpen,
  Flame,
  CheckCircle2,
  FileCheck2,
} from 'lucide-react';

export function DashboardPage({ onNavigate }) {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [nextActivity, setNextActivity] = useState(null);
  const [weakConcepts, setWeakConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [ov, na, wc] = await Promise.all([
        ApiClient.getMasteryOverview().catch(() => null),
        ApiClient.getNextActivity().catch(() => null),
        ApiClient.getWeakConcepts().catch(() => []),
      ]);
      setOverview(ov);
      setNextActivity(na);
      setWeakConcepts(wc || []);
    } catch (e) {
      console.warn('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }} className="fade-in">
        <Sparkles size={36} color="#6366F1" style={{ animation: 'spin 2s linear infinite' }} />
        <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Loading your adaptive learning profile...</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Header Welcome Banner */}
      <div
        className="card"
        style={{
          marginBottom: 24,
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
          borderColor: 'rgba(99, 102, 241, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: '1.75rem' }}>Welcome, {user?.full_name || 'Learner'} 👋</h1>
            <StatusBadge status={user?.role} />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Target Pathway:{' '}
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              {user?.profile?.target_role || 'Software Engineer'}
            </span>{' '}
            • Weekly Goal: {user?.profile?.target_hours_per_week || 10} hrs •{' '}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#F59E0B', fontWeight: 600 }}>
              <Flame size={14} /> {overview?.learning_streak_days || 0} Day Streak
            </span>
          </p>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={handleRefresh}
          disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={14} className={refreshing ? 'spinning' : ''} />
          <span>Sync Profile</span>
        </button>
      </div>

      {/* Course & Quiz KPI Summary */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Enrolled Courses</span>
            <BookOpen size={20} color="#6366F1" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#FFF', marginBottom: 4 }}>
            {overview?.enrolled_courses_count ?? 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            of {overview?.available_courses ?? 0} unlocked courses • {overview?.completed_courses_count ?? 0} done
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Quizzes Attempted</span>
            <FileCheck2 size={20} color="#06B6D4" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#FFF', marginBottom: 4 }}>
            {overview?.total_quizzes_attempted ?? 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Avg Score: {overview?.average_quiz_score ?? 0}%
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Overall Learning</span>
            <CheckCircle2 size={20} color="#10B981" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#FFF', marginBottom: 6 }}>
            {overview?.overall_learning_progress ?? 0}%
          </div>
          <ProgressBar percentage={overview?.overall_learning_progress ?? 0} />
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Mastered Skills</span>
            <Trophy size={20} color="#10B981" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#FFF', marginBottom: 4 }}>
            {overview?.mastered_count || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            of {overview?.total_skills || 0} skills • Avg {Math.round((overview?.average_mastery || 0) * 100)}%
          </div>
        </div>
      </div>

      {/* Course Progress & Recent Quizzes */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: '1.1rem' }}>Course Progress</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('courses')}>
              Browse Courses
            </button>
          </div>
          {!overview?.course_progress_summary || overview.course_progress_summary.length === 0 ? (
            <div style={{ padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No courses started yet. All {overview?.available_courses ?? 0} courses are unlocked in Courses.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {overview.course_progress_summary.map((cp) => (
                <div
                  key={cp.course_id}
                  onClick={() => onNavigate('courses')}
                  style={{
                    cursor: 'pointer',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{cp.title}</span>
                    <span style={{ color: cp.completion_percentage >= 100 ? 'var(--success)' : 'var(--primary)', fontWeight: 700 }}>
                      {cp.completion_percentage}%
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                    {cp.category} • {cp.completed_lessons_count} / {cp.total_lessons_count} lessons
                  </div>
                  <ProgressBar percentage={cp.completion_percentage} color={cp.completion_percentage >= 100 ? 'var(--success)' : null} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: '1.1rem' }}>Recent Quiz Results</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('assessments')}>
              All Quizzes
            </button>
          </div>
          {!overview?.recent_quiz_results || overview.recent_quiz_results.length === 0 ? (
            <div style={{ padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No quiz attempts recorded yet. Take a diagnostic quiz to measure skill mastery.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {overview.recent_quiz_results.map((q) => (
                <div
                  key={q.attempt_id}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{q.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {q.is_passed ? 'Passed' : 'Needs Review'}
                    </div>
                  </div>
                  <span className={`badge ${q.is_passed ? 'badge-success' : 'badge-warning'}`}>
                    {Math.round(q.score_achieved)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mastery KPI Overview Metrics */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Mastered Skills</span>
            <Trophy size={20} color="#10B981" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FFF', marginBottom: 4 }}>
            {overview?.mastered_count || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            of {overview?.total_skills ?? 0} technical nodes
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>In Progress</span>
            <Activity size={20} color="#6366F1" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FFF', marginBottom: 4 }}>
            {overview?.in_progress_count || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>actively calibrating</div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Diagnosed Weak</span>
            <AlertTriangle size={20} color="#F59E0B" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FFF', marginBottom: 4 }}>
            {overview?.weak_concepts_count || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>error rate &gt;= 40%</div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Average Mastery</span>
            <BrainCircuit size={20} color="#06B6D4" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FFF', marginBottom: 6 }}>
            {Math.round((overview?.average_mastery || 0) * 100)}%
          </div>
          <ProgressBar percentage={(overview?.average_mastery || 0) * 100} />
        </div>
      </div>

      {/* Adaptive Next Recommended Activity */}
      {nextActivity && (
        <div
          className="card"
          style={{
            marginBottom: 24,
            borderLeft: '4px solid var(--primary)',
            background: 'linear-gradient(135deg, rgba(23, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span className="badge badge-primary">Adaptive Engine Recommendation</span>
                <StatusBadge status={nextActivity.difficulty} />
              </div>
              <h2 style={{ fontSize: '1.35rem', marginBottom: 8 }}>{nextActivity.title}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', maxWidth: '800px', marginBottom: 14 }}>
                {nextActivity.rationale}
              </p>
            </div>

            <button
              id="btn-start-recommended"
              className="btn btn-primary"
              onClick={() => {
                if (nextActivity.action_url.includes('assessments')) {
                  onNavigate('assessments');
                } else if (nextActivity.action_url.includes('projects')) {
                  onNavigate('projects');
                } else {
                  onNavigate('taxonomy');
                }
              }}
            >
              Start Recommended Activity
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Diagnosed Weak Concepts & Quick Launch Cards */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Diagnosed Weak Concepts */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <AlertTriangle size={20} color="#F59E0B" />
            <h3 style={{ fontSize: '1.15rem' }}>Diagnosed Weak Concepts</h3>
          </div>

          {weakConcepts.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              No critical weaknesses diagnosed! Continue expanding through the Skill DAG.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {weakConcepts.slice(0, 3).map((w, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>{w.skill_title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Error Rate: <span style={{ color: '#F87171' }}>{Math.round(w.error_rate * 100)}%</span> • Current Mastery: {Math.round(w.current_mastery * 100)}%
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onNavigate('assessments')}
                  >
                    Reinforce
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Launchpad */}
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', marginBottom: 16 }}>Platform Learning Features</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <button
              id="card-launch-taxonomy"
              className="card card-clickable"
              style={{ padding: 14, textAlign: 'left', background: 'rgba(255, 255, 255, 0.02)' }}
              onClick={() => onNavigate('taxonomy')}
            >
              <BrainCircuit size={20} color="#6366F1" style={{ marginBottom: 6 }} />
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Skill Taxonomy DAG</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>9 technical domains</div>
            </button>

            <button
              id="card-launch-careers"
              className="card card-clickable"
              style={{ padding: 14, textAlign: 'left', background: 'rgba(255, 255, 255, 0.02)' }}
              onClick={() => onNavigate('careers')}
            >
              <Compass size={20} color="#06B6D4" style={{ marginBottom: 6 }} />
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Career Readiness</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gap analysis & roadmaps</div>
            </button>

            <button
              id="card-launch-coding"
              className="card card-clickable"
              style={{ padding: 14, textAlign: 'left', background: 'rgba(255, 255, 255, 0.02)' }}
              onClick={() => onNavigate('coding')}
            >
              <Code2 size={20} color="#10B981" style={{ marginBottom: 6 }} />
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Coding Practice</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Safe AST code sandbox</div>
            </button>

            <button
              id="card-launch-tutor"
              className="card card-clickable"
              style={{ padding: 14, textAlign: 'left', background: 'rgba(255, 255, 255, 0.02)' }}
              onClick={() => onNavigate('tutor')}
            >
              <Bot size={20} color="#EC4899" style={{ marginBottom: 6 }} />
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>AI Tutor & RAG</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Document grounded chat</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
