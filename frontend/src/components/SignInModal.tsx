import React, { useState } from 'react';
import { api } from '../services/api';

interface SignInModalProps {
  onSuccess: (username: string) => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({ onSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      setError('Please provide both username and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.login(cleanUser, password);
      onSuccess(res.username);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed. Please check your credentials.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div
        className="modal-dialog"
        style={{ maxWidth: '440px', width: '92vw', padding: '36px 32px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <span className="brand-mark">DC</span>
          <span className="brand-name">
            daily<br />
            <b>conversation</b>
          </span>
        </div>

        <p className="eyebrow">Sign In</p>
        <h2 style={{ fontSize: '26px', margin: '6px 0 10px' }}>Access your learning log</h2>
        <p className="muted" style={{ marginBottom: '24px' }}>
          Enter the credentials configured in your application properties to access your private transcripts and dashboard.
        </p>

        {error && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(226, 104, 95, 0.12)',
              border: '1px solid rgba(226, 104, 95, 0.3)',
              color: 'var(--danger)',
              fontSize: '13px',
              marginBottom: '18px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              htmlFor="auth-username"
              style={{
                display: 'block',
                fontSize: '11px',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--bone-faint)',
                fontWeight: 600,
                marginBottom: '8px',
              }}
            >
              Username
            </label>
            <input
              id="auth-username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
              autoComplete="username"
              spellCheck="false"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--line-strong)',
                background: 'rgba(0, 0, 0, 0.35)',
                color: 'var(--bone)',
                fontSize: '14px',
                fontFamily: 'var(--mono)',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              style={{
                display: 'block',
                fontSize: '11px',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--bone-faint)',
                fontWeight: 600,
                marginBottom: '8px',
              }}
            >
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--line-strong)',
                background: 'rgba(0, 0, 0, 0.35)',
                color: 'var(--bone)',
                fontSize: '14px',
                fontFamily: 'var(--mono)',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px',
              padding: '13px 20px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent)',
              color: '#15120a',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'progress' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 160ms ease',
            }}
          >
            {loading ? 'Verifying credentials…' : 'Sign in →'}
          </button>
        </form>
      </div>
    </div>
  );
};
