import { useEffect, useState, useRef } from 'react';

type Theme = 'daybook' | 'midnight' | 'nature' | 'cyberpunk';

const THEMES: { id: Theme; label: string }[] = [
  { id: 'daybook', label: 'Classic' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'nature', label: 'Nature' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
];

const AUTOLOCK_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 1, label: '1 min' },
  { value: 5, label: '5 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '60 min' },
];

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSetAutoLockTimeout: (minutes: number) => void;
}

export default function SettingsModal({ open, onClose, onSetAutoLockTimeout }: SettingsModalProps) {
  const [active, setActive] = useState<Theme>('daybook');
  const [autoLock, setAutoLock] = useState(0);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('timefiber_theme') as Theme;
    if (saved) {
      setActive(saved);
    }
    const savedLock = localStorage.getItem('timefiber_autolock_timeout');
    if (savedLock) {
      const val = parseInt(savedLock, 10);
      if (Number.isFinite(val) && val >= 0) setAutoLock(val);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const setTheme = (theme: Theme) => {
    setActive(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('timefiber_theme', theme);
  };

  const handleAutoLock = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mins = parseInt(e.target.value, 10);
    setAutoLock(mins);
    onSetAutoLockTimeout(mins);
  };

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div
        className="relative rounded-xl shadow-2xl border border-[var(--border)] p-6 w-full max-w-md mx-4"
        style={{ backgroundColor: 'var(--bg-color)' }}
      >
        {/* X close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors text-xl leading-none w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--header-bg)]"
        >
          &times;
        </button>

        <h2 className="text-lg font-bold text-[var(--text-main)] mb-5">Settings</h2>

        {/* Theme section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Theme</h3>
          <div className="flex gap-2 flex-wrap">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`
                  border rounded-md px-3 py-1.5 text-sm transition-all
                  ${active === t.id
                    ? 'border-[var(--accent)] text-[var(--text-main)] bg-[var(--header-bg)]'
                    : 'border-[var(--border)] text-[var(--text-muted)] bg-transparent hover:border-[var(--accent)]'
                  }
                `}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Auto-lock timeout section */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Auto-lock</h3>
          <select
            value={autoLock}
            onChange={handleAutoLock}
            className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-[var(--focus-bg)] text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] transition-colors appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' fill='none' stroke='%235C554D' stroke-width='1.5'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
              paddingRight: '2rem',
            }}
          >
            {AUTOLOCK_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Extension point gap for future sections */}
      </div>
    </div>
  );
}
