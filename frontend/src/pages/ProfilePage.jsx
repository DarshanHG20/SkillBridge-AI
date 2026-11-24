import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ApiClient from '../services/api.js';
import { User, Save, CheckCircle, AlertCircle, Clock, BookOpen, Compass } from 'lucide-react';

export default function ProfilePage({ onNavigate }) {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [headline, setHeadline] = useState(user?.profile?.headline || 'Aspiring Learner');
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [targetRole, setTargetRole] = useState(user?.profile?.target_role || 'Software Engineer');
  const [educationLevel, setEducationLevel] = useState(user?.profile?.education_level || 'Self-taught / University');
  const [targetHours, setTargetHours] = useState(user?.profile?.target_hours_per_week ?? 10);
  const [learningStyle, setLearningStyle] = useState(user?.profile?.preferred_learning_style || 'visual');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        setLoading(true);
        const me = await ApiClient.getMe();
        if (!active) return;
        setFullName(me.full_name || '');
        const p = me.profile || {};
        setHeadline(p.headline || 'Aspiring Learner');
        setBio(p.bio || '');
        setTargetRole(p.target_role || 'Software Engineer');
        setEducationLevel(p.education_level || 'Self-taught / University');
        setTargetHours(p.target_hours_per_week ?? 10);
        setLearningStyle(p.preferred_learning_style || 'visual');
      } catch (err) {
        if (active) setError(err.detail || err.message || 'Failed to load profile.');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const cleanName = fullName.trim();
      if (cleanName.length < 2) {
        throw new Error('Full name must be at least 2 characters.');
      }

      const hoursNum = Number(targetHours);
      if (!Number.isFinite(hoursNum) || hoursNum < 1 || hoursNum > 100) {
        throw new Error('Target study hours per week must be between 1 and 100.');
      }

      await ApiClient.updateMe({ full_name: cleanName });
      await ApiClient.updateProfile({
        headline: headline.trim(),
        bio: bio.trim(),
        target_role: targetRole.trim(),
        education_level: educationLevel.trim(),
        target_hours_per_week: hoursNum,
        preferred_learning_style: learningStyle,
      });

      await refreshUser();
      setSuccess('Your profile and learning preferences have been updated across Web & Mobile.');
    } catch (err) {
      setError(err.detail || err.message || 'Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        Loading your profile...
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ maxWidth: '820px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: 6 }}>Student Profile & Preferences</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Synced in real time across SkillBridge AI Web and Flutter Mobile.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('dashboard')}>
          Back to Dashboard
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      <div className="card" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'var(--primary-light)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#A5B4FC',
            flexShrink: 0,
          }}
        >
          <User size={28} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 4 }}>{fullName || user?.full_name}</h2>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{user?.email}</div>
        </div>
        <span className={`badge ${['admin', 'superadmin'].includes(user?.role) ? 'badge-warning' : 'badge-primary'}`}>
          {user?.role || 'student'}
        </span>
      </div>

      <form onSubmit={handleSave} className="card">
        <h3 style={{ fontSize: '1.1rem', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={18} color="var(--primary)" />
          Personal & Career Settings
        </h3>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={150}
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Profile Headline</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Full-Stack & AI Engineer"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Compass size={14} /> Target Career Role
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Backend Engineer"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Education Level</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. B.Sc. Computer Science"
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} /> Weekly Study Goal (hours)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              className="form-input"
              value={targetHours}
              onChange={(e) => setTargetHours(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Preferred Learning Style</label>
            <select
              className="form-input"
              value={learningStyle}
              onChange={(e) => setLearningStyle(e.target.value)}
            >
              <option value="visual">Visual (Diagrams & DAG)</option>
              <option value="hands_on">Hands-On (Projects & Coding)</option>
              <option value="reading">Reading & Documentation</option>
              <option value="interactive">Interactive (AI Tutor & Quizzes)</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Bio / Learning Goals</label>
          <textarea
            rows={4}
            className="form-input"
            placeholder="Describe your technical focus, certifications, or career objectives..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

