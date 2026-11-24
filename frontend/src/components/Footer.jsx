import React from 'react';

export function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '24px 20px',
        background: 'rgba(11, 15, 25, 0.95)',
        marginTop: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
        }}
      >
        <div>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>SkillBridge AI</span> — Adaptive AI Learning & Mastery Modeling Platform.
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <span>9 Skill Domains</span>
          <span>•</span>
          <span>RAG Pipeline</span>
          <span>•</span>
          <span>AST Code Sandbox</span>
          <span>•</span>
          <span>Verified Analytics</span>
        </div>
        <div>
          &copy; {new Date().getFullYear()} SkillBridge AI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default Footer;
