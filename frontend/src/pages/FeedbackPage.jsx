import React, { useState, useEffect } from 'react';
import ApiClient from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';

export default function FeedbackPage() {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState('general');
  const [rating, setRating] = useState(5);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    loadMyFeedback();
  }, []);

  const loadMyFeedback = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.getMyFeedback();
      setFeedbackList(Array.isArray(data) ? data : data.feedback || []);
    } catch (err) {
      console.warn('Could not load feedback history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await ApiClient.submitFeedback({
        category,
        rating: Number(rating),
        title: subject.trim(),
        subject: subject.trim(),
        message: message.trim()
      });

      setSuccessMsg('Your feedback has been submitted successfully! Thank you for helping us improve.');
      setSubject('');
      setMessage('');
      setCategory('general');
      setRating(5);
      loadMyFeedback();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ padding: '30px 20px', minHeight: '85vh' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 className="text-gradient" style={{ margin: 0, fontSize: '2rem' }}>Feedback & Platform Inquiries</h1>
        <p className="text-muted" style={{ margin: '6px 0 0 0' }}>
          Report issues, suggest learning materials, or evaluate platform experience directly with educators.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', alignItems: 'flex-start' }}>
        
        {/* Left: Feedback Form */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.25rem' }}>Submit Feedback</h2>

          {successMsg && (
            <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--accent-green)', color: '#34d399', marginBottom: '20px', fontSize: '0.9rem' }}>
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--accent-red)', color: '#f87171', marginBottom: '20px', fontSize: '0.9rem' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>
                  Category
                </label>
                <select
                  className="input-control"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="general">General Feedback</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature_request">Feature Request</option>
                  <option value="content_quality">Content Quality / Question Correction</option>
                  <option value="ui_ux">UI / UX Experience</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>
                  Overall Satisfaction
                </label>
                <select
                  className="input-control"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5 - Exceptional)</option>
                  <option value={4}>⭐⭐⭐⭐ (4 - Good)</option>
                  <option value={3}>⭐⭐⭐ (3 - Average)</option>
                  <option value={2}>⭐⭐ (2 - Needs Work)</option>
                  <option value={1}>⭐ (1 - Unsatisfactory)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>
                Subject / Topic
              </label>
              <input
                type="text"
                className="input-control"
                placeholder="Brief summary of your observation"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>
                Detailed Message
              </label>
              <textarea
                className="input-control"
                rows={5}
                placeholder="Describe your suggestion, encountered error, or feedback in detail..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                style={{ resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ alignSelf: 'flex-start', minWidth: '150px' }}
            >
              {submitting ? 'Submitting...' : 'Send Feedback'}
            </button>
          </form>
        </div>

        {/* Right: Feedback History */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.25rem' }}>Your Prior Submissions</h2>
          
          {loading ? (
            <div className="text-center text-muted" style={{ padding: '30px 0' }}>Loading submission history...</div>
          ) : feedbackList.length === 0 ? (
            <div className="text-center text-muted" style={{ padding: '30px 0', fontSize: '0.9rem' }}>
              No feedback submissions logged yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {feedbackList.map((item) => (
                <div
                  key={item.id || item._id}
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{item.title || item.subject}</span>
                    <StatusBadge status={item.status || 'pending'} />
                  </div>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--text-light)', lineHeight: 1.5 }}>
                    {item.message}
                  </p>
                  
                  {item.admin_notes && (
                    <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '0.8rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>Admin Response: </span>
                      <span style={{ color: 'var(--text-muted)' }}>{item.admin_notes}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>Category: <strong>{item.category}</strong></span>
                    <span>{new Date(item.created_at || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
