import React from 'react';

interface SidebarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  username: string;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onNavigate,
  username,
  onSignOut,
}) => {
  const initial = (username || 'A').charAt(0).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">DC</span>
        <span className="brand-name">
          daily<br />
          <b>conversation</b>
        </span>
      </div>
      <p className="eyebrow">Your learning log</p>
      <nav>
        <button
          type="button"
          className={activeSection === 'overview' ? 'active' : ''}
          onClick={() => onNavigate('overview')}
        >
          <span className="nav-dot"></span>Overview
        </button>
        <button
          type="button"
          className={activeSection === 'sessions' ? 'active' : ''}
          onClick={() => onNavigate('sessions')}
        >
          <span className="nav-dot"></span>Sessions
        </button>
        <button
          type="button"
          className={activeSection === 'leaderboard' ? 'active' : ''}
          onClick={() => onNavigate('leaderboard')}
        >
          <span className="nav-dot"></span>Leaderboard
        </button>
      </nav>
      <div className="sidebar-note">
        <p className="eyebrow">Private by design</p>
        <p>Transcripts stay in your own database. Only you see what's here.</p>
      </div>
      <div className="sidebar-footer" style={{ justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
          <span className="avatar">{initial}</span>
          <div>
            <b>{username}</b>
            <small>Personal journal</small>
          </div>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          title="Sign out"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--bone-faint)',
            cursor: 'pointer',
            fontSize: '12px',
            padding: '4px 8px',
            borderRadius: '6px',
            transition: 'color 150ms ease',
          }}
          onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'var(--danger)')}
          onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--bone-faint)')}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
};
