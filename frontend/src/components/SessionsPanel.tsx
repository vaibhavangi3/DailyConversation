import React from 'react';
import type { ConversationResponse } from '../types/api';
import { formatDate, providerLabel } from '../utils/formatters';

interface SessionsPanelProps {
  conversations: ConversationResponse[];
  filter: string;
  onFilterChange: (filter: string) => void;
  onSelectConversation: (conversation: ConversationResponse) => void;
  onDeleteConversation: (id: string) => void;
}

export const SessionsPanel: React.FC<SessionsPanelProps> = ({
  conversations,
  filter,
  onFilterChange,
  onSelectConversation,
  onDeleteConversation,
}) => {
  const filtered = conversations.filter(
    (item) => filter === 'all' || item.provider === filter
  );

  return (
    <div className="panel sessions-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Recent sessions</p>
          <h2>Keep the thread going</h2>
        </div>
        <div className="filters">
          <button
            type="button"
            className={`filter ${filter === 'all' ? 'active' : ''}`}
            onClick={() => onFilterChange('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`filter ${filter === 'OpenAI' ? 'active' : ''}`}
            onClick={() => onFilterChange('OpenAI')}
          >
            ChatGPT
          </button>
          <button
            type="button"
            className={`filter ${filter === 'Google' ? 'active' : ''}`}
            onClick={() => onFilterChange('Google')}
          >
            Gemini
          </button>
          <button
            type="button"
            className={`filter ${filter === 'Anthropic' ? 'active' : ''}`}
            onClick={() => onFilterChange('Anthropic')}
          >
            Claude
          </button>
        </div>
      </div>

      <div id="session-list" className="session-list">
        {filtered.length === 0 ? (
          <div className="empty">
            <span>✦</span>
            <p>{conversations.length ? 'No sessions for this provider' : 'No sessions yet'}</p>
            <small>
              {conversations.length
                ? 'Try another filter.'
                : 'Paste your first shared link above to start your learning log.'}
            </small>
          </div>
        ) : (
          filtered.map((item, index) => (
            <article
              key={item.id}
              className="session"
              style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('.delete-btn')) return;
                onSelectConversation(item);
              }}
            >
              <div className="session-bar"></div>
              <div>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <div className="session-meta">
                  <span className="provider">{providerLabel(item.provider)}</span>
                  <b>{item.topic}</b>
                  <span>·</span>
                  <span>{item.estimatedMinutes} min</span>
                  <span className="effort-chip">Effort {item.effortScore}/100</span>
                </div>
              </div>
              <div className="session-side">
                <span className="duration">{formatDate(item.importedAt)}</span>
                <button
                  type="button"
                  className="delete-btn"
                  title="Delete"
                  aria-label="Delete session"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(item.id);
                  }}
                >
                  ✕
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
};
