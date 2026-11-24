import React, { useState, useEffect } from 'react';
import ApiClient from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';

export default function CodingPracticePage() {
  const [problems, setProblems] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [code, setCode] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('editor'); // 'editor', 'hints', 'submissions'
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProblems();
  }, [difficultyFilter]);

  const loadProblems = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.listCodingProblems(null, difficultyFilter || null);
      const list = Array.isArray(data) ? data : data.problems || [];
      setProblems(list);
      const stillPresent = selectedProblem && list.some((p) => (p.id || p._id) === (selectedProblem.id || selectedProblem._id));
      if (list.length > 0 && !stillPresent) {
        selectProblem(list[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectProblem = async (prob) => {
    try {
      const full = await ApiClient.getCodingProblem(prob.slug || prob.id);
      setSelectedProblem(full);
      setCode(full.starter_code || '# Write your solution below\n\ndef solution():\n    pass\n');
      setResult(null);
      setActiveTab('editor');
      loadSubmissions(full.id || full._id);
    } catch (err) {
      setError('Failed to load problem specifications');
    }
  };

  const loadSubmissions = async (probId) => {
    try {
      const res = await ApiClient.getMyCodingSubmissions(probId);
      setSubmissions(Array.isArray(res) ? res : res.submissions || []);
    } catch (err) {
      console.warn('Could not load past submissions:', err);
    }
  };

  const handleSubmitSolution = async () => {
    if (!selectedProblem || submitting) return;
    setSubmitting(true);
    setResult(null);
    try {
      const probId = selectedProblem.id || selectedProblem._id;
      const res = await ApiClient.submitCodingSolution(probId, code);
      setResult(res);
      loadSubmissions(probId);
    } catch (err) {
      setResult({
        success: false,
        status: 'error',
        message: err.message || 'Execution error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetCode = () => {
    if (!selectedProblem) return;
    if (confirm('Reset your editor to starter boilerplate?')) {
      setCode(selectedProblem.starter_code || '# Write your solution below\n');
      setResult(null);
    }
  };

  return (
    <div className="container" style={{ padding: '30px 20px', minHeight: '85vh' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="text-gradient" style={{ margin: 0, fontSize: '2rem' }}>Interactive Coding Lab</h1>
            <span className="badge badge-accent">AST Safe Sandbox</span>
          </div>
          <p className="text-muted" style={{ margin: '6px 0 0 0' }}>
            Algorithm challenges verified with static AST security analysis and test case validation.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <select
            className="input-control"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            style={{ width: '160px' }}
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Problem Selector + Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        
        {/* Left: Problem Catalog */}
        <div className="glass-panel" style={{ height: '750px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>
            Curated Challenges ({problems.length})
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {loading ? (
              <div className="text-center text-muted" style={{ padding: '30px 0' }}>Loading catalog...</div>
            ) : problems.length === 0 ? (
              <div className="text-center text-muted" style={{ padding: '30px 10px' }}>No problems found</div>
            ) : (
              problems.map((prob) => {
                const isSelected = selectedProblem && (selectedProblem.id || selectedProblem._id) === (prob.id || prob._id);
                return (
                  <div
                    key={prob.id || prob._id}
                    onClick={() => selectProblem(prob)}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      marginBottom: '10px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{prob.title}</span>
                      <StatusBadge status={prob.difficulty || 'medium'} />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Skill: {prob.skill_slug || prob.skill_name || 'General'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Problem Details & Code Runner */}
        {selectedProblem ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Problem Spec Card */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{selectedProblem.title}</h2>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px', alignItems: 'center' }}>
                    <StatusBadge status={selectedProblem.difficulty || 'medium'} />
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                      Skill: <strong>{selectedProblem.skill_slug || 'Algorithms'}</strong>
                    </span>
                  </div>
                </div>
                
                {/* Navigation Tabs */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className={`btn ${activeTab === 'editor' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                    onClick={() => setActiveTab('editor')}
                  >
                    Code Editor
                  </button>
                  <button
                    className={`btn ${activeTab === 'hints' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                    onClick={() => setActiveTab('hints')}
                  >
                    Hints ({selectedProblem.hints?.length || 0})
                  </button>
                  <button
                    className={`btn ${activeTab === 'submissions' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                    onClick={() => setActiveTab('submissions')}
                  >
                    Submissions ({submissions.length})
                  </button>
                </div>
              </div>

              {/* Description */}
              <div style={{ fontSize: '0.92rem', color: 'var(--text-light)', lineHeight: 1.6, marginTop: '12px' }}>
                <p>{selectedProblem.description}</p>
                {selectedProblem.constraints && (
                  <div style={{ marginTop: '12px', background: 'rgba(0, 0, 0, 0.2)', padding: '12px 16px', borderRadius: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--accent-blue)' }}>Constraints:</span>
                    <pre style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {selectedProblem.constraints}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Tab: Editor */}
            {activeTab === 'editor' && (
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Python 3 Solution</span>
                  <button
                    onClick={resetCode}
                    className="btn btn-outline"
                    style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                  >
                    Reset Starter Code
                  </button>
                </div>

                {/* Editor Container */}
                <div style={{ position: 'relative' }}>
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    style={{
                      width: '100%',
                      height: '320px',
                      backgroundColor: '#0a0f1d',
                      color: '#e2e8f0',
                      fontFamily: '"Fira Code", monospace, Consolas',
                      fontSize: '0.92rem',
                      lineHeight: '1.5',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      resize: 'vertical',
                      tabSize: 4
                    }}
                    spellCheck="false"
                  />
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleSubmitSolution}
                    disabled={submitting || !code.trim()}
                    style={{ minWidth: '150px' }}
                  >
                    {submitting ? 'Running Tests...' : 'Run & Submit Solution'}
                  </button>
                </div>

                {/* Result Display Box */}
                {result && (() => {
                  const isAccepted = Boolean(result.success || result.status === 'passed');
                  const astInfo = result.ast_check || result.static_analysis_feedback_json || null;
                  const computedScore = result.score !== undefined
                    ? result.score
                    : (result.total_tests > 0
                      ? Math.round((result.tests_passed / result.total_tests) * 100)
                      : astInfo?.code_quality_score);
                  const testCases = result.test_results || result.test_results_json;
                  const feedbackMsg = result.feedback || result.message || astInfo?.error || astInfo?.error_message || astInfo?.advice
                    || (isAccepted ? 'All test cases evaluated cleanly.' : 'Some test cases or static checks did not pass.');

                  return (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '18px',
                        borderRadius: '10px',
                        border: `1px solid ${isAccepted ? 'var(--accent-green)' : 'var(--accent-red)'}`,
                        background: isAccepted ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: isAccepted ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {isAccepted ? '✔ Solution Accepted!' : `✖ Evaluation Failed (${result.status || 'rejected'})`}
                        </span>
                        {computedScore !== undefined && computedScore !== null && (
                          <span className="badge badge-accent">Score: {computedScore}%</span>
                        )}
                      </div>

                      {/* AST Security Status */}
                      {astInfo && (
                        <div style={{ fontSize: '0.82rem', marginBottom: '8px', color: 'var(--text-muted)' }}>
                          AST Security Scanner: <strong>{astInfo.is_safe !== false ? 'Clean (No unsafe modules)' : 'Blocked (Unsafe call or syntax issue)'}</strong>
                        </div>
                      )}

                      {/* Feedback message */}
                      <p style={{ margin: '6px 0', fontSize: '0.9rem' }}>
                        {feedbackMsg}
                      </p>

                      {/* Test Results Breakdown */}
                      {testCases && Array.isArray(testCases) && (
                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {testCases.map((tr, idx) => {
                            const casePassed = Boolean(tr.passed ?? tr.is_passed);
                            return (
                              <div
                                key={idx}
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '6px',
                                  background: 'rgba(0, 0, 0, 0.3)',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  fontSize: '0.82rem'
                                }}
                              >
                                <span>Test #{idx + 1}: {tr.is_hidden ? 'Hidden Case' : (tr.input ? `Input (${JSON.stringify(tr.input)})` : 'Sample Case')}</span>
                                <span style={{ color: casePassed ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                                  {casePassed ? 'Passed' : 'Failed'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Tab: Hints */}
            {activeTab === 'hints' && (
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Progressive Pedagogical Hints</h3>
                {selectedProblem.hints && selectedProblem.hints.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {selectedProblem.hints.map((hint, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '14px 18px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--accent-blue)', marginBottom: '4px' }}>
                          Hint {idx + 1}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>
                          {hint}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted">No progressive hints registered for this problem yet.</p>
                )}
              </div>
            )}

            {/* Tab: Submissions */}
            {activeTab === 'submissions' && (
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Submission History</h3>
                {submissions.length === 0 ? (
                  <p className="text-muted">No previous submissions for this problem.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {submissions.map((sub, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '14px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                            {sub.status === 'passed' ? '✔ Solution Accepted' : '✖ Failed Test Cases'}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {new Date(sub.created_at || Date.now()).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className={`badge ${sub.status === 'passed' ? 'badge-success' : 'badge-danger'}`}>
                            {sub.score !== undefined
                              ? `${sub.score}%`
                              : (sub.total_tests > 0
                                ? `${Math.round(((sub.tests_passed || 0) / sub.total_tests) * 100)}% (${sub.tests_passed || 0}/${sub.total_tests})`
                                : sub.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
            <p className="text-muted">Select a coding challenge from the left sidebar to start practicing.</p>
          </div>
        )}
      </div>
    </div>
  );
}
