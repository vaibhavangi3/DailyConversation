import React, { useState } from 'react';
import type { ConversationResponse } from '../types/api';
import { api } from '../services/api';

interface ImportCardProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onImportSuccess: (conversation: ConversationResponse) => void;
}

export const ImportCard: React.FC<ImportCardProps> = ({ inputRef, onImportSuccess }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'default' | 'loading' | 'success' | 'error'; message: string }>({
    type: 'default',
    message: 'Your shared link must be public. The original transcript stays private in your local database.',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = url.trim();
    if (!cleanUrl) return;

    setLoading(true);
    setStatus({
      type: 'loading',
      message: 'Fetching the shared page and creating your learning summary.',
    });

    try {
      const result = await api.importConversation({ url: cleanUrl });
      setUrl('');
      setStatus({
        type: 'success',
        message: 'Session added to your learning log.',
      });
      onImportSuccess(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Import failed.';
      setStatus({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const getNoteClassName = () => {
    if (status.type === 'success') return 'form-note success';
    if (status.type === 'error') return 'form-note error';
    return 'form-note';
  };

  return (
    <section className="import-card" id="import-card">
      <div className="import-copy">
        <p className="eyebrow">Add a new session</p>
        <h2>What did you explore today?</h2>
        <p className="import-lede">
          Paste a public ChatGPT, Gemini or Claude share link. We'll extract the conversation and map your learning.
        </p>
      </div>
      <form id="import-form" className="import-form-wrapper" onSubmit={handleSubmit}>
        <label htmlFor="url">Shared conversation link</label>
        <div className="input-row">
          <input
            id="url"
            ref={inputRef}
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://chatgpt.com/share/…"
            autoComplete="off"
            spellCheck="false"
            disabled={loading}
          />
          <button type="submit" id="import-button" disabled={loading}>
            {loading ? (
              'Reading conversation…'
            ) : (
              <>
                Import session <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </div>
        <p className={getNoteClassName()} id="form-note">
          {status.message}
        </p>
      </form>
    </section>
  );
};
