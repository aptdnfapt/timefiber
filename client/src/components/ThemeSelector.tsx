import { useEffect, useState } from 'react';

type Theme = 'daybook' | 'midnight' | 'nature' | 'cyberpunk';

const THEMES: { id: Theme; label: string }[] = [
  { id: 'daybook', label: 'Classic' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'nature', label: 'Nature' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
];

export default function ThemeSelector() {
  const [active, setActive] = useState<Theme>('daybook');

  useEffect(() => {
    const saved = localStorage.getItem('chrono_theme') as Theme;
    if (saved) {
      setActive(saved);
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  const setTheme = (theme: Theme) => {
    setActive(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('chrono_theme', theme);
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          className={`
            border rounded-md px-3 py-1 text-sm transition-all
            ${active === t.id
              ? 'border-[var(--accent)] text-[var(--text-main)] bg-[var(--header-bg)]'
              : 'border-[var(--border)] text-[var(--text-muted)] bg-transparent'
            }
          `}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
