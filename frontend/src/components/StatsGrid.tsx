import React from 'react';
import type { StatsResponse } from '../types/api';
import { formatMinutes } from '../utils/formatters';

interface StatsGridProps {
  stats: StatsResponse | null;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
  const count = stats?.conversationCount ?? 0;
  const learningMinutes = stats?.learningMinutes ?? 0;
  const topicCount = stats?.topicCount ?? 0;
  const topTopic = stats?.topTopic || '—';
  const { hours, mins } = formatMinutes(learningMinutes);

  return (
    <section className="stats-grid" id="overview">
      <article className="stat">
        <span className="stat-label">Total sessions</span>
        <strong id="session-count">{count}</strong>
        <small>conversations logged</small>
      </article>

      <article className="stat">
        <span className="stat-label">Learning time</span>
        <strong id="learning-time">
          {hours}<span>h</span> {mins}<span>m</span>
        </strong>
        <small>estimated across all dates</small>
      </article>

      <article className="stat accent">
        <span className="stat-label">Topic explored</span>
        <strong id="top-topic">{topTopic}</strong>
        <small id="topic-count-label">
          {topicCount} {topicCount === 1 ? 'area' : 'areas'} explored
        </small>
      </article>

      <article className="stat">
        <span className="stat-label">Topic areas</span>
        <strong id="topic-count">{topicCount}</strong>
        <small>distinct areas explored</small>
      </article>
    </section>
  );
};
