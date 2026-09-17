import React from 'react';

interface TopbarProps {
  onAddSessionClick: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onAddSessionClick }) => {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Overview</p>
        <h1>Your learning, <em>remembered.</em></h1>
      </div>
      <button
        type="button"
        className="topbar-link"
        onClick={onAddSessionClick}
        style={{ background: 'transparent', cursor: 'pointer' }}
      >
        Add a session <span aria-hidden="true">→</span>
      </button>
    </header>
  );
};
