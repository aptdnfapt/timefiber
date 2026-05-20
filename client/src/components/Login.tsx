import { useState } from 'react';
import { api } from '../api';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { token } = await api.login(password);
      localStorage.setItem('auth_token', token);
      onLogin();
    } catch {
      setError('Wrong password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-[var(--header-bg)] border border-[var(--border)] rounded-lg p-8 w-full max-w-md">
        <h1 className="font-playfair text-3xl text-[var(--text-main)] mb-2">
          TimeFiber
        </h1>
        <p className="text-[var(--text-muted)] mb-6">Time Tracking / Infinity Table</p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoFocus
            className="w-full border border-[var(--border)] bg-[var(--bg-color)] text-[var(--text-main)] rounded-md p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          {error && (
            <p className="text-red-500 text-sm mb-4">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--btn-bg)] text-[var(--btn-text)] py-3 rounded-md font-bold transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {loading ? '...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
