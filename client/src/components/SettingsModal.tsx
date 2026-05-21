import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../api';
import type { Entry } from '../types';

type Theme = 'daybook' | 'midnight' | 'nature' | 'cyberpunk';
type SettingsTab = 'general' | 'gallery';

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
  entries?: Entry[];
}

function countImageUsage(entries: Entry[], uuid: string): number {
  const pattern = new RegExp(`!\\[.*?\\]\\(/uploads/${uuid}\\.?[a-zA-Z0-9]*\\)`, 'g');
  let count = 0;
  for (const entry of entries) {
    if (entry.activity && pattern.test(entry.activity)) count++;
  }
  return count;
}

export default function SettingsModal({ open, onClose, onSetAutoLockTimeout, entries = [] }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [activeTheme, setActiveTheme] = useState<Theme>('daybook');
  const [autoLock, setAutoLock] = useState(0);
  const [images, setImages] = useState<{ uuid: string; url: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setActiveTab('general');
      return;
    }
    const saved = localStorage.getItem('timefiber_theme') as Theme;
    if (saved) {
      setActiveTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    }
    const savedLock = localStorage.getItem('timefiber_autolock_timeout');
    if (savedLock) {
      const val = parseInt(savedLock, 10);
      if (Number.isFinite(val) && val >= 0) setAutoLock(val);
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmDelete) setConfirmDelete(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, confirmDelete]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.getImages()
      .then((data) => setImages(data.images))
      .catch(() => setImages([]))
      .finally(() => setLoading(false));
  }, [open]);

  const setTheme = (theme: Theme) => {
    setActiveTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('timefiber_theme', theme);
  };

  const handleAutoLock = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mins = parseInt(e.target.value, 10);
    setAutoLock(mins);
    onSetAutoLockTimeout(mins);
  };

  const handleDelete = useCallback(async (uuid: string) => {
    try {
      await api.deleteImage(uuid);
      setImages((prev) => prev.filter((img) => img.uuid !== uuid));
    } catch {
      // silently fail
    }
    setConfirmDelete(null);
  }, []);

  if (!open) return null;

  const sidebarItem = (tab: SettingsTab, label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`w-full text-left px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
        activeTab === tab
          ? 'bg-[var(--header-bg)] text-[var(--accent)]'
          : 'text-[var(--text-muted)] hover:bg-[var(--header-bg)]/40 hover:text-[var(--text-main)]'
      }`}
    >
      {label}
    </button>
  );

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
        className="relative rounded-xl shadow-2xl border border-[var(--border)] w-full max-w-2xl mx-4 flex overflow-hidden"
        style={{ backgroundColor: 'var(--bg-color)', maxHeight: '70vh' }}
      >
        {/* X close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors text-xl leading-none w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--header-bg)] z-10"
        >
          &times;
        </button>

        {/* Sidebar */}
        <div
          className="w-40 flex-shrink-0 border-r border-[var(--border)] p-3 flex flex-col gap-1"
          style={{ backgroundColor: 'var(--header-bg)' }}
        >
          {sidebarItem('general', 'General')}
          {sidebarItem('gallery', 'Gallery')}
        </div>

        {/* Content area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'general' && (
            <div>
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
                        ${activeTheme === t.id
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
            </div>
          )}

          {activeTab === 'gallery' && (
            <div>
              <h2 className="text-lg font-bold text-[var(--text-main)] mb-4">Gallery</h2>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="animate-spin h-6 w-6 text-[var(--accent)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : images.length === 0 ? (
                <p className="text-center text-[var(--text-muted)] py-10">No images uploaded yet</p>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {images.map((img) => (
                    <div key={img.uuid} className="relative group">
                      <div className="aspect-square rounded-md overflow-hidden border border-[var(--border)] bg-[var(--header-bg)]">
                        <img
                          src={`${img.url}.webp`}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1 truncate">{img.uuid}</p>
                      <button
                        onClick={() => setConfirmDelete(img.uuid)}
                        className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                        title="Delete"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-xl shadow-xl border border-[var(--border)] p-5 w-full max-w-sm mx-4" style={{ backgroundColor: 'var(--bg-color)' }}>
            <h3 className="text-base font-bold text-[var(--text-main)] mb-2">Delete image?</h3>
            {((): JSX.Element | null => {
              const usage = countImageUsage(entries, confirmDelete);
              if (usage > 0) {
                return <p className="text-sm text-[var(--text-muted)] mb-4">This image is used in {usage} {usage === 1 ? 'entry' : 'entries'}.</p>;
              }
              return null;
            })()}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-3 py-1.5 text-sm rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--accent)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-3 py-1.5 text-sm rounded-md bg-[var(--del-btn)] text-white hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
