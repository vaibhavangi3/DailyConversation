import React, { useEffect, useState, useCallback } from 'react';
import type { LeaderboardEntry } from '../types/api';
import { api } from '../services/api';
import { formatDate, leaderboardMetric, providerLabel } from '../utils/formatters';

interface LeaderboardSectionProps {
  onSelectId: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  refreshTrigger: number;
}

export const LeaderboardSection: React.FC<LeaderboardSectionProps> = ({
  onSelectId,
  onDeleteConversation,
  refreshTrigger,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [sort, setSort] = useState<string>('time');
  const [provider, setProvider] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      const data = await api.getLeaderboard(sort, provider);
      setEntries(data);
    } catch {
      // Keep previous entries on error or empty
    }
  }, [sort, provider]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  return (
    <section className="leaderboard-section" id="leaderboard">
      <div className="panel leaderboard-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Leaderboard</p>
            <h2>Explore your strongest sessions</h2>
          </div>
          <div className="leaderboard-filters">
            <select
              id="leaderboard-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort leaderboard"
            >
              <option value="time">Most time spent</option>
              <option value="latest">Latest chat</option>
              <option value="input_tokens">Most input tokens</option>
              <option value="output_tokens">Most output tokens</option>
              <option value="effort">Highest effort</option>
            </select>
            <select
              id="leaderboard-provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              aria-label="Filter by provider"
            >
              <option value="">All providers</option>
              <option value="OpenAI">ChatGPT</option>
              <option value="Google">Gemini</option>
              <option value="Anthropic">Claude</option>
            </select>
          </div>
        </div>

        <div id="leaderboard-list" className="leaderboard-list">
          {entries.length === 0 ? (
            <p className="muted">No sessions match these filters.</p>
          ) : (
            entries.slice(0, 10).map((item, index) => (
              <article
                key={item.id}
                className="leaderboard-row"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('.delete-btn')) return;
                  onSelectId(item.id);
                }}
              >
                <span className="rank">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>
                    <span className="provider">{providerLabel(item.provider)}</span>
                    <span>{item.topic}</span>
                    <span>·</span>
                    <span>{formatDate(item.importedAt)}</span>
                  </p>
                </div>
                <div className="leaderboard-end">
                  <div className="leaderboard-metrics">
                    <b>{leaderboardMetric(item, sort)}</b>
                    <small>Effort {item.effortScore}/100</small>
                  </div>
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
    </section>
  );
};
