import React, { useState, useEffect } from 'react';
import ApiClient from '../services/api.js';
import { StatusBadge, ProgressBar } from '../components/StatusBadge.jsx';
import {
  FolderGit2,
  CheckSquare,
  Award,
  Link as LinkIcon,
  CheckCircle2,
  ExternalLink,
  Edit3,
} from 'lucide-react';

export function ProjectsPage({ onNavigate }) {
  const [projects, setProjects] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [editProgress, setEditProgress] = useState(null); // { id, completion_percentage, status, evidence_notes }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewTab, setViewTab] = useState('catalog'); // 'catalog' | 'portfolio'

  const loadData = async () => {
    try {
      const [projList, portList] = await Promise.all([
        ApiClient.listProjects().catch(() => []),
        ApiClient.getMyPortfolio().catch(() => []),
      ]);
      setProjects(projList || []);
      setPortfolio(portList || []);
    } catch (e) {
      console.warn('Projects load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenProgressModal = (project) => {
    setEditProgress({
      id: project.id,
      title: project.title,
      completion_percentage: project.completion_percentage || 0,
      status: project.user_status === 'not_started' ? 'in_progress' : (project.user_status || 'in_progress'),
      evidence_notes: project.evidence_notes || '',
    });
  };

  const handleSaveProgress = async () => {
    if (!editProgress) return;
    setSaving(true);
    try {
      await ApiClient.updateProjectProgress(editProgress.id, {
        completion_percentage: editProgress.completion_percentage,
        status: editProgress.status,
        evidence_notes: editProgress.evidence_notes,
      });
      setEditProgress(null);
      await loadData(); // Refresh list
    } catch (e) {
      alert(`Could not save progress: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <FolderGit2 size={28} color="#6366F1" />
            <h1 style={{ fontSize: '1.75rem' }}>Hands-On Projects & Portfolio</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Build demonstrable evidence through milestone checklists, evaluation rubrics, and portfolio repository tracking.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-sm ${viewTab === 'catalog' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewTab('catalog')}
          >
            Project Catalog ({projects.length})
          </button>
          <button
            className={`btn btn-sm ${viewTab === 'portfolio' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewTab('portfolio')}
          >
            My Portfolio ({portfolio.length})
          </button>
        </div>
      </div>

      {viewTab === 'catalog' ? (
        <div className="grid-3">
          {projects.map(proj => {
            const isCompleted = proj.user_status === 'completed';
            const isEnrolled = proj.is_enrolled;

            return (
              <div key={proj.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <StatusBadge status={proj.difficulty} />
                    <StatusBadge status={proj.user_status} />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: 8 }}>{proj.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 16 }}>
                    {proj.description}
                  </p>

                  {/* Milestones count */}
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                    Deliverables: {proj.milestones_json?.length || 0} milestone phases
                  </div>
                </div>

                <div>
                  {isEnrolled && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Completion</span>
                        <span style={{ fontWeight: 600 }}>{proj.completion_percentage}%</span>
                      </div>
                      <ProgressBar percentage={proj.completion_percentage} />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => handleOpenProgressModal(proj)}
                    >
                      <Edit3 size={14} />
                      <span>{isEnrolled ? 'Update Progress' : 'Enroll in Project'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Portfolio View */
        <div className="card">
          <h3 style={{ fontSize: '1.2rem', marginBottom: 16 }}>Tracked Projects & Evidence Portfolio</h3>
          {portfolio.length === 0 ? (
            <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              No projects enrolled yet. Enroll in a project template to build your verified portfolio.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {portfolio.map(p => (
                <div
                  key={p.id}
                  style={{
                    padding: 18,
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 14,
                  }}
                >
                  <div style={{ minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <h4 style={{ fontSize: '1.05rem' }}>{p.project_title}</h4>
                      <StatusBadge status={p.status} />
                    </div>
                    {p.evidence_notes && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                        Evidence: {p.evidence_notes}
                      </p>
                    )}
                  </div>

                  <div style={{ width: '180px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                      <span>Progress</span>
                      <span style={{ fontWeight: 600 }}>{p.completion_percentage}%</span>
                    </div>
                    <ProgressBar percentage={p.completion_percentage} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Progress Update Modal Dialog */}
      {editProgress && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 20,
          }}
        >
          <div className="card fade-in" style={{ maxWidth: '500px', width: '100%', padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: 6 }}>Update Milestone Progress</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 20 }}>
              {editProgress.title}
            </p>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label className="form-label">Completion Percentage</label>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                  {editProgress.completion_percentage}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={editProgress.completion_percentage}
                onChange={(e) =>
                  setEditProgress(prev => ({
                    ...prev,
                    completion_percentage: parseInt(e.target.value, 10),
                    status: parseInt(e.target.value, 10) === 100 ? 'completed' : 'in_progress',
                  }))
                }
                style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={editProgress.status}
                onChange={(e) => setEditProgress(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="in_progress">In Progress</option>
                <option value="submitted">Submitted for Review</option>
                <option value="completed">Completed & Verified</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Evidence / Notes (e.g. GitHub Repository, Demo Link)</label>
              <textarea
                rows={3}
                className="form-input"
                placeholder="https://github.com/username/project-repo"
                value={editProgress.evidence_notes}
                onChange={(e) => setEditProgress(prev => ({ ...prev, evidence_notes: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditProgress(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveProgress}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Progress'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectsPage;
