import React, { useState, useEffect } from 'react';
import ApiClient from '../services/api.js';
import { StatusBadge, ProgressBar } from '../components/StatusBadge.jsx';
import { BookOpen, CheckCircle2, PlayCircle, ArrowLeft, Clock, Award, FileQuestion } from 'lucide-react';

export default function CoursesPage({ onNavigate }) {
  const [courses, setCourses] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeCourse, setActiveCourse] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingLesson, setSavingLesson] = useState(false);
  const [error, setError] = useState(null);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await ApiClient.listCourses();
      setCourses(data || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const openCourse = async (courseId) => {
    try {
      setLoading(true);
      const detail = await ApiClient.getCourseDetail(courseId);
      setActiveCourse(detail);
      const firstLesson = detail.modules?.[0]?.lessons?.[0] || null;
      setActiveLesson(firstLesson);
    } catch (err) {
      setError(err.message || 'Could not load course details.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!activeCourse) return;
    try {
      const updated = await ApiClient.enrollInCourse(activeCourse.id);
      setActiveCourse(updated);
      loadCourses();
    } catch (err) {
      setError(err.message || 'Could not enroll in course.');
    }
  };

  const handleToggleLesson = async (lesson) => {
    if (!activeCourse || savingLesson) return;
    setSavingLesson(true);
    try {
      const res = await ApiClient.completeLesson(
        activeCourse.id,
        lesson.lesson_id,
        !lesson.is_completed
      );
      const refreshed = await ApiClient.getCourseDetail(activeCourse.id);
      setActiveCourse(refreshed);
      const allLessons = (refreshed.modules || []).flatMap((m) => m.lessons || []);
      const updatedLesson = allLessons.find((l) => l.lesson_id === lesson.lesson_id);
      if (updatedLesson) setActiveLesson(updatedLesson);
      loadCourses();
      return res;
    } catch (err) {
      setError(err.message || 'Failed to update lesson progress.');
    } finally {
      setSavingLesson(false);
    }
  };

  const categories = ['All', ...Array.from(new Set(courses.map((c) => c.category).filter(Boolean)))];
  const filtered = selectedCategory === 'All'
    ? courses
    : courses.filter((c) => c.category === selectedCategory);

  if (loading && courses.length === 0 && !activeCourse) {
    return (
      <div className="text-center text-muted" style={{ padding: '70px 0' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        Loading learning courses...
      </div>
    );
  }

  if (activeCourse) {
    const modules = activeCourse.modules || [];
    return (
      <div className="fade-in">
        <button
          className="btn btn-secondary btn-sm"
          style={{ marginBottom: 16 }}
          onClick={() => {
            setActiveCourse(null);
            setActiveLesson(null);
            loadCourses();
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to All Courses</span>
        </button>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <span className="badge badge-primary">{activeCourse.category}</span>
                <StatusBadge status={activeCourse.difficulty_level} />
                <span className="badge badge-success">Unlocked</span>
              </div>
              <h1 style={{ fontSize: '1.75rem', marginBottom: 6 }}>{activeCourse.title}</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: 14 }}>
                {activeCourse.description}
              </p>
              <div style={{ maxWidth: 420 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                  <span>{activeCourse.completed_lessons_count} / {activeCourse.total_lessons_count} lessons completed</span>
                  <strong>{activeCourse.completion_percentage}%</strong>
                </div>
                <ProgressBar percentage={activeCourse.completion_percentage} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!activeCourse.is_enrolled && (
                <button className="btn btn-primary" onClick={handleEnroll}>
                  <PlayCircle size={16} />
                  <span>Enroll & Start Course</span>
                </button>
              )}
              {activeCourse.assessment_id && (
                <button
                  className="btn btn-secondary"
                  onClick={() => onNavigate('assessments')}
                >
                  <FileQuestion size={16} />
                  <span>Take Course Quiz ({activeCourse.assessment?.question_count ?? 5} Qs)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid-3" style={{ gridTemplateColumns: '1fr 2fr', alignItems: 'start' }}>
          {/* Modules & Lessons Sidebar */}
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 14 }}>Curriculum Modules</h3>
            {modules.map((mod) => (
              <div key={mod.module_id} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 8, color: 'var(--text-primary)' }}>
                  {mod.title}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(mod.lessons || []).map((l) => {
                    const isSelected = activeLesson?.lesson_id === l.lesson_id;
                    return (
                      <button
                        key={l.lesson_id}
                        type="button"
                        onClick={() => setActiveLesson(l)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          textAlign: 'left',
                          background: isSelected ? 'var(--primary-light)' : 'rgba(255,255,255,0.03)',
                          border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        {l.is_completed ? (
                          <CheckCircle2 size={16} color="#10B981" />
                        ) : (
                          <PlayCircle size={16} color="#6366F1" />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{l.title}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {l.duration_minutes} mins
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Active Lesson Content */}
          <div className="card">
            {activeLesson ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                  <h2 style={{ fontSize: '1.35rem' }}>{activeLesson.title}</h2>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <Clock size={14} /> {activeLesson.duration_minutes} min read
                  </span>
                </div>

                <p style={{ color: 'var(--text-light)', lineHeight: 1.7, marginBottom: 18 }}>
                  {activeLesson.content}
                </p>

                {activeLesson.code_example && (
                  <pre className="code-box" style={{ marginBottom: 18 }}>
                    <code>{activeLesson.code_example}</code>
                  </pre>
                )}

                {activeLesson.key_takeaways && activeLesson.key_takeaways.length > 0 && (
                  <div style={{ padding: 14, borderRadius: 'var(--radius-md)', background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.25)', marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 8, color: 'var(--secondary)' }}>
                      Key Takeaways
                    </div>
                    <ul style={{ marginLeft: 18, color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                      {activeLesson.key_takeaways.map((kt, idx) => (
                        <li key={idx}>{kt}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    className={`btn ${activeLesson.is_completed ? 'btn-success' : 'btn-primary'}`}
                    disabled={savingLesson}
                    onClick={() => handleToggleLesson(activeLesson)}
                  >
                    <CheckCircle2 size={16} />
                    <span>
                      {savingLesson
                        ? 'Saving...'
                        : (activeLesson.is_completed ? 'Completed ✔ (Undo)' : 'Mark Lesson Completed')}
                    </span>
                  </button>
                  {activeCourse.assessment_id && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => onNavigate('assessments')}
                    >
                      <Award size={16} />
                      <span>Go to Course Quiz</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted">Select a lesson on the left to begin studying.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <BookOpen size={28} color="#6366F1" />
          <h1 style={{ fontSize: '1.75rem' }}>Learning Courses Catalog</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          All learning courses are unlocked and ready. Study interactive lessons, track completion percentages, and test your knowledge.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: 24, padding: '14px 18px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid-3">
        {filtered.map((course) => (
          <div
            key={course.id}
            className="card card-clickable"
            onClick={() => openCourse(course.id)}
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span className="badge badge-primary">{course.category}</span>
                <span className={`badge ${course.completion_percentage >= 100 ? 'badge-success' : (course.is_enrolled ? 'badge-warning' : 'badge-secondary')}`}>
                  {course.completion_percentage >= 100 ? 'Completed' : (course.is_enrolled ? 'In Progress' : 'Unlocked')}
                </span>
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: 6 }}>{course.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: 14 }}>
                {course.subtitle || course.description}
              </p>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                <span>{course.modules_count} Modules • {course.total_lessons_count} Lessons</span>
                <span>{course.completion_percentage}%</span>
              </div>
              <ProgressBar percentage={course.completion_percentage || 0} color={course.completion_percentage >= 100 ? 'var(--success)' : null} />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ width: '100%', marginTop: 14 }}
                onClick={(e) => {
                  e.stopPropagation();
                  openCourse(course.id);
                }}
              >
                {course.is_enrolled ? 'Continue Learning' : 'Start Course'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

