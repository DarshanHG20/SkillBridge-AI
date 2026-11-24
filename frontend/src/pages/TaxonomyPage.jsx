import React, { useState, useEffect } from 'react';
import ApiClient from '../services/api.js';
import { StatusBadge, ProgressBar } from '../components/StatusBadge.jsx';
import { Network, Lock, Unlock, CheckCircle2, Search, ArrowRight } from 'lucide-react';

export function TaxonomyPage({ onNavigate }) {
  const [tree, setTree] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const categories = [
    'All',
    'Python',
    'Java',
    'SQL',
    'DSA',
    'Web Development',
    'Data Science',
    'AI/ML',
    'Networking',
    'Cybersecurity',
  ];

  useEffect(() => {
    async function loadTree() {
      try {
        const data = await ApiClient.getTaxonomyTree();
        setTree(data || []);
      } catch (err) {
        console.warn('Taxonomy load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTree();
  }, []);

  const filtered = tree.filter(node => {
    const matchesCategory = selectedCategory === 'All' || node.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      !search ||
      node.title.toLowerCase().includes(search.toLowerCase()) ||
      (node.description && node.description.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Network size={28} color="#6366F1" />
          <h1 style={{ fontSize: '1.75rem' }}>Skill Knowledge Taxonomy & DAG</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Explore the directed acyclic graph (DAG) across 9 technical domains. Prerequisites unlock advanced concept nodes as your mastery score reaches 70%.
        </p>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {categories.map(cat => (
              <button
                key={cat}
                className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', minWidth: '240px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search concepts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 34, fontSize: '0.85rem' }}
            />
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 11 }} />
          </div>
        </div>
      </div>

      {/* Skill Nodes Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Rendering dependency knowledge graph...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
          No skills match your active category or search query.
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map(node => {
            const isMastered = node.mastery_score >= 0.85;
            const isUnlocked = node.is_unlocked;

            return (
              <div
                key={node.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  opacity: isUnlocked ? 1 : 0.65,
                  borderColor: isMastered ? 'rgba(16, 185, 129, 0.4)' : (isUnlocked ? 'rgba(99, 102, 241, 0.25)' : 'var(--border-subtle)'),
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span className="badge badge-primary">{node.category}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <StatusBadge status={node.difficulty_level} />
                      {isUnlocked ? (
                        <Unlock size={14} color="#10B981" title="Unlocked" />
                      ) : (
                        <Lock size={14} color="#F59E0B" title="Prerequisites pending" />
                      )}
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', marginBottom: 8 }}>{node.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 16, minHeight: 42 }}>
                    {node.description || 'Core foundational competency.'}
                  </p>
                </div>

                <div>
                  {/* Mastery Progress */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Mastery Level</span>
                      <span style={{ fontWeight: 600, color: isMastered ? '#10B981' : '#FFF' }}>
                        {Math.round(node.mastery_score * 100)}%
                      </span>
                    </div>
                    <ProgressBar
                      percentage={node.mastery_score * 100}
                      color={isMastered ? 'var(--success)' : null}
                    />
                  </div>

                  {/* Prerequisites info */}
                  {node.prerequisites && node.prerequisites.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                      Prerequisites: {node.prerequisites.length} required node(s)
                    </div>
                  )}

                  <button
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%' }}
                    onClick={() => onNavigate('assessments')}
                  >
                    {isMastered ? 'Review & Practice' : (isUnlocked ? 'Take Assessment' : 'Practice Concept Quiz')}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TaxonomyPage;
