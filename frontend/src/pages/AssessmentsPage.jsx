import React, { useState, useEffect } from 'react';
import ApiClient from '../services/api.js';
import { StatusBadge, ProgressBar } from '../components/StatusBadge.jsx';
import {
  FileCheck2,
  Clock,
  HelpCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';

export function AssessmentsPage({ onNavigate }) {
  const [assessments, setAssessments] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeSession, setActiveSession] = useState(null); // { attempt_id, assessment_id, title, questions, answers: Map }
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [attemptResult, setAttemptResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'history'

  const loadData = async () => {
    try {
      const [asmList, histList] = await Promise.all([
        ApiClient.listAssessments().catch(() => []),
        ApiClient.getAssessmentHistory().catch(() => []),
      ]);
      setAssessments(asmList || []);
      setHistory(histList || []);
    } catch (e) {
      console.warn('Assessments load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartQuiz = async (assessmentId) => {
    setLoading(true);
    try {
      const session = await ApiClient.startAssessment(assessmentId);
      setActiveSession({
        ...session,
        answers: {}, // question_id -> selected_option
      });
      setCurrentQIndex(0);
      setAttemptResult(null);
    } catch (e) {
      alert(`Could not start assessment: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId, option) => {
    if (!activeSession) return;
    setActiveSession(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: option,
      },
    }));
  };

  const handleSubmitAttempt = async () => {
    if (!activeSession || submitting) return;
    setSubmitting(true);
    try {
      const payload = Object.entries(activeSession.answers).map(([qId, val]) => ({
        question_id: parseInt(qId, 10),
        selected_option: val,
        time_spent_seconds: 20,
      }));

      // Include un-answered questions as null
      for (const q of activeSession.questions) {
        if (!activeSession.answers[q.id]) {
          payload.push({ question_id: q.id, selected_option: '', time_spent_seconds: 0 });
        }
      }

      const result = await ApiClient.submitAssessment(activeSession.attempt_id, payload);
      setAttemptResult(result);
      setActiveSession(null);
      loadData(); // Refresh history
    } catch (e) {
      alert(`Failed to submit: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 1. ACTIVE QUIZ SESSION MODE
  if (activeSession) {
    const currentQ = activeSession.questions[currentQIndex];
    const answeredCount = Object.keys(activeSession.answers).length;
    const totalQ = activeSession.questions.length;

    return (
      <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Quiz Header */}
        <div className="card" style={{ marginBottom: 20, padding: '16px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <span className="badge badge-primary" style={{ marginBottom: 4 }}>Active Assessment</span>
              <h2 style={{ fontSize: '1.25rem' }}>{activeSession.title}</h2>
            </div>
            {activeSession.time_limit_minutes && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#F59E0B', fontWeight: 600 }}>
                <Clock size={16} />
                <span>{activeSession.time_limit_minutes} min limit</span>
              </div>
            )}
          </div>
          <ProgressBar percentage={totalQ > 0 ? (answeredCount / totalQ) * 100 : 0} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>
            <span>Question {currentQIndex + 1} of {totalQ}</span>
            <span>{answeredCount} Answered</span>
          </div>
        </div>

        {/* Current Question Card */}
        {currentQ && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Point Value: {currentQ.points} pts
              </span>
              <StatusBadge status={currentQ.difficulty} />
            </div>

            <h3 style={{ fontSize: '1.2rem', marginBottom: 20, lineHeight: 1.5 }}>
              {currentQ.prompt}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {(currentQ.options || currentQ.options_json || []).map((opt, idx) => {
                const isSelected = activeSession.answers[currentQ.id] === opt;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(currentQ.id, opt)}
                    style={{
                      padding: '14px 18px',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'left',
                      background: isSelected ? 'var(--primary-light)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                      color: isSelected ? '#FFF' : 'var(--text-primary)',
                      fontWeight: isSelected ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        border: isSelected ? '2px solid var(--primary)' : '2px solid var(--text-muted)',
                        background: isSelected ? 'var(--primary)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#FFF',
                      }}
                    >
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Navigation buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={currentQIndex === 0}
                onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
              >
                <ArrowLeft size={16} />
                <span>Previous</span>
              </button>

              {currentQIndex < totalQ - 1 ? (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setCurrentQIndex(prev => Math.min(totalQ - 1, prev + 1))}
                >
                  <span>Next Question</span>
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  id="btn-submit-quiz"
                  className="btn btn-success"
                  onClick={handleSubmitAttempt}
                  disabled={submitting}
                >
                  {submitting ? 'Scoring Answers...' : 'Submit Assessment'}
                  <CheckCircle2 size={16} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. ATTEMPT RESULT REVIEW MODE
  if (attemptResult) {
    return (
      <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="card" style={{ marginBottom: 24, textAlign: 'center', padding: '36px 24px' }}>
          <div style={{ display: 'inline-flex', marginBottom: 12 }}>
            {attemptResult.is_passed ? (
              <CheckCircle2 size={56} color="#10B981" />
            ) : (
              <XCircle size={56} color="#EF4444" />
            )}
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: 6 }}>
            {attemptResult.is_passed ? 'Assessment Passed! 🎉' : 'Assessment Attempt Recorded'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
            {attemptResult.title} • Minimum Passing Score: {attemptResult.pass_percentage}%
          </p>

          <div style={{ display: 'inline-block', padding: '12px 24px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 24 }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, color: attemptResult.is_passed ? '#10B981' : '#F59E0B' }}>
              {attemptResult.score_achieved}%
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setAttemptResult(null)}>
              Return to Catalog
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('dashboard')}>
              Go to Dashboard
            </button>
          </div>
        </div>

        {/* Question-by-Question Diagnostic Feedback */}
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', marginBottom: 16 }}>Diagnostic Question Analysis</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {(attemptResult.questions_breakdown || []).map((q, idx) => (
              <div
                key={idx}
                style={{
                  padding: 16,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${q.is_correct ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Question {idx + 1}</span>
                  <StatusBadge status={q.is_correct ? 'passed' : 'failed'} label={q.is_correct ? 'Correct' : 'Incorrect'} />
                </div>
                <p style={{ marginBottom: 10, fontSize: '0.95rem' }}>{q.prompt}</p>

                <div style={{ fontSize: '0.85rem', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Your Answer: </span>
                  <span style={{ color: q.is_correct ? '#34D399' : '#F87171', fontWeight: 600 }}>
                    {q.learner_response || '(No response)'}
                  </span>
                </div>

                {!q.is_correct && (
                  <div style={{ fontSize: '0.85rem', marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Correct Answer: </span>
                    <span style={{ color: '#34D399', fontWeight: 600 }}>{q.correct_answer}</span>
                  </div>
                )}

                {q.explanation && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 6 }}>
                    💡 <strong>Diagnostic Rationale:</strong> {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 3. CATALOG & HISTORY LIST MODE
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <FileCheck2 size={28} color="#6366F1" />
            <h1 style={{ fontSize: '1.75rem' }}>Diagnostic & Formative Assessments</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Continuous competency evaluations calibrated by the adaptive mastery engine with exponential moving average (EMA) updates.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-sm ${activeTab === 'catalog' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('catalog')}
          >
            Assessment Catalog
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('history')}
          >
            Attempt History ({history.length})
          </button>
        </div>
      </div>

      {activeTab === 'catalog' ? (
        loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>Loading assessment bank...</div>
        ) : (
          <div className="grid-3">
            {assessments.map(asm => (
              <div key={asm.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span className="badge badge-primary">{asm.assessment_type}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pass: {asm.pass_percentage}%</span>
                  </div>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: 8 }}>{asm.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 16 }}>
                    {asm.description || 'Evaluate core conceptual competency and receive targeted diagnostic feedback.'}
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                    <span>{asm.question_count != null ? `${asm.question_count} Questions` : 'Interactive Assessment'}</span>
                    {asm.time_limit_minutes && <span>{asm.time_limit_minutes} Mins</span>}
                  </div>
                  <button
                    id={`btn-launch-asm-${asm.id}`}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%' }}
                    onClick={() => handleStartQuiz(asm.id)}
                  >
                    Start Assessment
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', marginBottom: 16 }}>Chronological Assessment Attempts</h3>
          {history.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              No completed assessment attempts recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history.map(att => (
                <div
                  key={att.id}
                  style={{
                    padding: '14px 18px',
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
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>{att.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Completed on {att.completed_at ? new Date(att.completed_at).toLocaleDateString() : 'Recent'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 700, color: att.is_passed ? '#10B981' : '#F59E0B' }}>
                        {att.score_achieved}%
                      </div>
                      <StatusBadge status={att.is_passed ? 'passed' : 'failed'} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AssessmentsPage;
