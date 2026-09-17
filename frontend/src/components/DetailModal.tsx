import React, { useEffect, useState } from 'react';
import type { ConversationResponse } from '../types/api';
import { formatDate, providerLabel } from '../utils/formatters';

interface DetailModalProps {
  conversation: ConversationResponse | null;
  onClose: () => void;
  onReanalyze: (id: string) => Promise<void>;
  onDelete: (id: string) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  conversation,
  onClose,
  onReanalyze,
  onDelete,
}) => {
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalyzeError, setReanalyzeError] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (conversation) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [conversation, onClose]);

  if (!conversation) return null;

  const isStale =
    conversation.analysisStatus === 'FALLBACK_NO_API_KEY' ||
    conversation.analysisStatus === 'FALLBACK_AI_ERROR' ||
    conversation.effortScore === 0 ||
    !(conversation.keywords || []).length;

  const handleReanalyzeClick = async () => {
    setReanalyzing(true);
    setReanalyzeError(false);
    try {
      await onReanalyze(conversation.id);
    } catch {
      setReanalyzeError(true);
    } finally {
      setReanalyzing(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog" role="dialog" aria-modal="true">
        <button
          type="button"
          className="close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          ×
        </button>

        <div className="detail-content">
          <p className="eyebrow">
            {providerLabel(conversation.provider)} · {conversation.topic}
          </p>
          <h2>{conversation.title}</h2>
          <p className="detail-summary">
            {conversation.context || conversation.summary}
          </p>

          <div className="insight-row">
            <div className="effort-card">
              <span className="insight-label">Learning effort</span>
              <strong>
                {conversation.effortScore}
                <small>/100</small>
              </strong>
              <div className="effort-track">
                <span
                  style={{
                    width: `${Math.max(0, Math.min(100, conversation.effortScore))}%`,
                  }}
                ></span>
              </div>
              <p>Based on observable questions, follow-ups, attempts, and application.</p>
            </div>

            <div className="detail-block">
              <h4>Keywords</h4>
              <div className="tag-list">
                {(conversation.keywords || []).map((keyword, index) => (
                  <span key={index} className="tag">
                    {keyword}
                  </span>
                ))}
              </div>
              <h4 className="mt-lg">How you learnt</h4>
              <p className="detail-method">
                {conversation.studyMethod} · {conversation.difficulty}
              </p>
            </div>
          </div>

          <div className="detail-columns">
            <div className="detail-block">
              <h4>Key learnings</h4>
              <ul>
                {(conversation.keyLearnings || []).map((learning, index) => (
                  <li key={index}>{learning}</li>
                ))}
              </ul>
            </div>
            <div className="detail-block">
              <h4>Concepts</h4>
              <div className="tag-list">
                {(conversation.concepts || []).map((concept, index) => (
                  <span key={index} className="tag">
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="detail-block detail-spaced">
            <h4>Next steps</h4>
            <ul>
              {(conversation.nextSteps || []).map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ul>
          </div>

          <div className="detail-footer">
            <span>
              Estimated {conversation.estimatedMinutes} minutes ·{' '}
              {formatDate(conversation.importedAt)}
            </span>
            <div className="detail-actions">
              {isStale && (
                <button
                  type="button"
                  id="reanalyze-btn"
                  className="btn-ghost"
                  disabled={reanalyzing}
                  onClick={handleReanalyzeClick}
                >
                  {reanalyzing
                    ? 'Analysing…'
                    : reanalyzeError
                    ? 'Failed — try again'
                    : 'Re-analyse ↻'}
                </button>
              )}
              <button
                type="button"
                id="delete-detail-btn"
                className="btn-danger"
                onClick={() => onDelete(conversation.id)}
              >
                Delete ✕
              </button>
              <a
                href={conversation.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open original ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
