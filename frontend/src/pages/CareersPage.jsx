import React, { useState, useEffect } from 'react';
import ApiClient from '../services/api.js';
import { StatusBadge, ProgressBar } from '../components/StatusBadge.jsx';
import {
  Compass,
  Briefcase,
  TrendingUp,
  Calendar,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export function CareersPage({ onNavigate }) {
  const [careers, setCareers] = useState([]);
  const [selectedCareer, setSelectedCareer] = useState(null);
  const [gapAnalysis, setGapAnalysis] = useState(null);
  const [roadmaps, setRoadmaps] = useState([]);
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  const [planType, setPlanType] = useState('90_day');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCareers() {
      try {
        const [cList, rList] = await Promise.all([
          ApiClient.listCareers().catch(() => []),
          ApiClient.getMyRoadmaps().catch(() => []),
        ]);
        setCareers(cList || []);
        setRoadmaps(rList || []);
        if (cList && cList.length > 0) {
          handleSelectCareer(cList[0]);
        }
      } catch (e) {
        console.warn('Careers load error:', e);
      } finally {
        setLoading(false);
      }
    }
    loadCareers();
  }, []);

  const handleSelectCareer = async (career) => {
    setSelectedCareer(career);
    try {
      const gap = await ApiClient.getCareerGapAnalysis(career.slug);
      setGapAnalysis(gap);
    } catch (e) {
      console.warn('Gap analysis fetch error:', e);
    }
  };

  const handleGenerateRoadmap = async () => {
    if (!selectedCareer) return;
    setGeneratingRoadmap(true);
    try {
      const newRoadmap = await ApiClient.generateRoadmap(selectedCareer.slug, planType);
      const updated = await ApiClient.getMyRoadmaps();
      setRoadmaps(updated || []);
      alert(`Successfully generated ${newRoadmap.title}!`);
    } catch (e) {
      alert(`Could not generate roadmap: ${e.message}`);
    } finally {
      setGeneratingRoadmap(false);
    }
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Compass size={28} color="#06B6D4" />
          <h1 style={{ fontSize: '1.75rem' }}>Career Intelligence & Dynamic Roadmaps</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Evaluate industry benchmark competencies, analyze real-time skill gaps, and generate actionable 30, 60, or 90-day learning roadmaps.
        </p>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid-3" style={{ gridTemplateColumns: '1fr 2fr', alignItems: 'start' }}>
        {/* Left Column: Career Selector Catalog */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 4 }}>Career Pathways</h3>
          {careers.map(c => {
            const isSelected = selectedCareer?.slug === c.slug;
            return (
              <div
                key={c.id}
                className={`card card-clickable ${isSelected ? 'active' : ''}`}
                style={{
                  padding: 16,
                  borderColor: isSelected ? 'var(--primary)' : 'var(--border-subtle)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-card)',
                }}
                onClick={() => handleSelectCareer(c)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <h4 style={{ fontSize: '1rem', color: isSelected ? '#A5B4FC' : '#FFF' }}>{c.title}</h4>
                  <Briefcase size={16} color={isSelected ? '#6366F1' : 'var(--text-muted)'} />
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                  {c.industry || 'Technology'} • {c.average_salary_range || 'Competitive'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {c.requirements?.length || 0} required competencies
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Gap Analysis & Roadmap Generation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {selectedCareer && gapAnalysis && (
            <>
              {/* Readiness Card */}
              <div
                className="card"
                style={{
                  background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.8) 0%, rgba(30, 27, 75, 0.7) 100%)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <span className="badge badge-primary" style={{ marginBottom: 6 }}>Career Readiness Score</span>
                    <h2 style={{ fontSize: '1.4rem' }}>{selectedCareer.title}</h2>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '2.2rem', fontWeight: 800, color: gapAnalysis.readiness_percentage >= 75 ? '#10B981' : '#F59E0B' }}>
                      {gapAnalysis.readiness_percentage}%
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Benchmark Readiness</span>
                  </div>
                </div>
                <ProgressBar percentage={gapAnalysis.readiness_percentage} />
              </div>

              {/* Prioritized Competency Gaps List */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: '1.15rem' }}>Competency Gap Analysis</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Prioritized by delta to target mastery
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(gapAnalysis.skill_gaps || []).map((gap, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12,
                      }}
                    >
                      <div style={{ minWidth: '220px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{gap.skill_title}</span>
                          <StatusBadge status={gap.priority === 'high' ? 'failed' : (gap.priority === 'medium' ? 'in_progress' : 'mastered')} label={`${gap.priority} priority`} />
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Domain: {gap.category}</div>
                      </div>

                      <div style={{ width: '160px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                          <span>Current: {Math.round(gap.current_mastery * 100)}%</span>
                          <span style={{ color: '#10B981' }}>Target: {Math.round(gap.target_mastery * 100)}%</span>
                        </div>
                        <ProgressBar percentage={gap.current_mastery * 100} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actionable Roadmap Generator Card */}
              <div className="card" style={{ borderLeft: '4px solid var(--secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', marginBottom: 4 }}>Generate Actionable Milestone Roadmap</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      Constructs a step-by-step deliverable schedule targeting your specific competency gaps.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      className="form-input"
                      style={{ width: '130px', padding: '8px 12px', fontSize: '0.85rem' }}
                      value={planType}
                      onChange={(e) => setPlanType(e.target.value)}
                    >
                      <option value="30_day">30-Day Sprint</option>
                      <option value="60_day">60-Day Path</option>
                      <option value="90_day">90-Day Full</option>
                    </select>

                    <button
                      id="btn-generate-roadmap"
                      className="btn btn-primary btn-sm"
                      onClick={handleGenerateRoadmap}
                      disabled={generatingRoadmap}
                    >
                      <Sparkles size={14} />
                      <span>{generatingRoadmap ? 'Synthesizing...' : 'Generate Roadmap'}</span>
                    </button>
                  </div>
                </div>

                {/* Legal Disclaimer Box */}
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '10px 14px',
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  ℹ️ {gapAnalysis.disclaimer}
                </div>
              </div>

              {/* Active Saved Roadmaps */}
              {roadmaps.length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: '1.15rem', marginBottom: 16 }}>Your Active Milestone Roadmaps</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {roadmaps.map(r => (
                      <div
                        key={r.id}
                        style={{
                          padding: 16,
                          borderRadius: 'var(--radius-md)',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: '1rem' }}>{r.title}</span>
                          <span className="badge badge-primary">{r.plan_type.replace('_', ' ')}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                          {r.milestones?.length || 0} milestone deliverable(s)
                        </div>

                        {/* Milestones timeline */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {(r.milestones || []).map((m, mIdx) => (
                            <div
                              key={mIdx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                fontSize: '0.85rem',
                                color: 'var(--text-primary)',
                              }}
                            >
                              <CheckCircle2 size={16} color="#6366F1" />
                              <span style={{ fontWeight: 500 }}>{m.title}</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({m.timeline_days})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CareersPage;
