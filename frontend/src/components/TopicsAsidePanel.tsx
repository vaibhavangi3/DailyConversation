import React from 'react';
import type { StatsResponse } from '../types/api';
import { formatDay } from '../utils/formatters';

interface TopicsAsidePanelProps {
  stats: StatsResponse | null;
}

export const TopicsAsidePanel: React.FC<TopicsAsidePanelProps> = ({ stats }) => {
  const dailyLearning = stats?.dailyLearning || [];
  const topics = stats?.topics || [];

  const maxTopicMinutes = topics.length > 0
    ? Math.max(...topics.map((t) => t.minutes))
    : 1;

  return (
    <aside className="panel topics-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Learning time</p>
          <h2>By date</h2>
        </div>
      </div>

      <div id="daily-list" className="daily-list">
        {dailyLearning.length === 0 ? (
          <p className="muted">Your daily learning time will appear here.</p>
        ) : (
          dailyLearning.slice(0, 10).map((day) => (
            <div key={day.date} className="daily-row">
              <span>{formatDay(day.date)}</span>
              <b>{day.minutes} min</b>
              <small>
                {day.count} {day.count === 1 ? 'session' : 'sessions'}
              </small>
            </div>
          ))
        )}
      </div>

      <div className="section-heading topic-heading">
        <div>
          <p className="eyebrow">By topic</p>
          <h2>Where time went</h2>
        </div>
      </div>

      <div id="topic-list" className="topic-list">
        {topics.length === 0 ? (
          <p className="muted">Your topics will appear here.</p>
        ) : (
          topics.slice(0, 6).map((topic) => {
            const percentage = Math.max(8, Math.round((topic.minutes / maxTopicMinutes) * 100));
            return (
              <div key={topic.topic} className="topic-row">
                <div className="topic-row-head">
                  <span>{topic.topic}</span>
                  <span>
                    {topic.minutes} min · {topic.count} {topic.count === 1 ? 'session' : 'sessions'}
                  </span>
                </div>
                <div className="bar-bg">
                  <div className="bar-fill" style={{ width: `${percentage}%` }}></div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
