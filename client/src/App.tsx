import { useState, useEffect, useRef, useCallback } from 'react';
import { Entry, ROW_COLORS } from './types';
import { api } from './api';
import { useLockManager } from './lib/lock';
import Login from './components/Login';
import LockOverlay from './components/LockOverlay';
import SettingsModal from './components/SettingsModal';
import EditableCell from './components/EditableCell';
import RowActions from './components/RowActions';
import ImageLightbox from './components/ImageLightbox';


const COLUMNS = [
  { key: 'week_number' as const, label: 'Week No', width: '5%' },
  { key: 'month_number' as const, label: 'Month No', width: '5%' },
  { key: 'date' as const, label: 'Date', width: '5%' },
  { key: 'day_name' as const, label: 'Day', width: '7.5%' },
  { key: 'season' as const, label: 'Season', width: '7.5%' },
  { key: 'time_string' as const, label: 'Time', width: '7.5%' },
  { key: 'detail' as const, label: 'Detail', width: '14.5%' },
  { key: 'place' as const, label: 'Place', width: '14%' },
  { key: 'activity' as const, label: 'Activities', width: '34%' },
];

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { locked, lock, unlock: rawUnlock, setAutoLockTimeout } = useLockManager();

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.getEntries();
      setEntries(data);
      setAuthenticated(true);
    } catch {
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  }, []);

  const unlock = useCallback(async (password: string) => {
    const ok = await rawUnlock(password);
    if (ok) {
      await checkAuth();
    }
    return ok;
  }, [rawUnlock, checkAuth]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('timefiber_theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as string;
      if (detail) setLightboxSrc(detail);
    };
    window.addEventListener('lightbox-open', handler);
    return () => window.removeEventListener('lightbox-open', handler);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }
    if (!locked) {
      checkAuth();
    }
  }, [locked, checkAuth]);

  const handleLogin = () => {
    checkAuth();
  };

  const updateCell = async (id: number, column: string, value: string) => {
    await api.updateEntry(id, column, value);
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [column]: value } : e))
    );
  };

  const deleteRow = async (id: number) => {
    if (!confirm('Delete this row?')) return;
    await api.deleteEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const addRow = async () => {
    const now = new Date();
    const calcWeek = Math.ceil(now.getDate() / 7);
    const moNo = String(now.getMonth() + 1).padStart(2, '0');
    const dte = String(now.getDate()).padStart(2, '0');
    const dayText = now.toLocaleDateString('default', { weekday: 'long' });

    const h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const readableTime = `${(h % 12) || 12}:${m} ${ampm}`;

    let calcSeason = 'Winter';
    const monthIndex = now.getMonth();
    if (monthIndex >= 2 && monthIndex <= 4) calcSeason = 'Spring';
    else if (monthIndex >= 5 && monthIndex <= 7) calcSeason = 'Summer';
    else if (monthIndex >= 8 && monthIndex <= 10) calcSeason = 'Autumn';

    const newEntry = await api.createEntry({
      week_number: String(calcWeek),
      month_number: moNo,
      date: dte,
      day_name: dayText,
      season: calcSeason,
      time_string: readableTime,
      detail: '',
      place: '',
      activity: '',
    });

    setEntries((prev) => [...prev, newEntry]);
    setExpandedId(newEntry.id);

    setTimeout(() => {
      const container = scrollRef.current;
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      }
      const cell = document.getElementById(`activity-${newEntry.id}`);
      cell?.focus();
    }, 50);
  };

  if (locked) {
    return <LockOverlay onUnlock={unlock} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Loading...</p>
      </div>
    );
  }

  if (!authenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 border-b-2 border-[var(--accent)] gap-3 sm:gap-4">
        <h1 className="font-playfair text-xl sm:text-3xl text-[var(--text-main)] flex items-center gap-2 sm:gap-3">
          TimeFiber
          <span className="text-[var(--accent)] italic font-playfair text-sm sm:text-lg">/ Time Tracking</span>
        </h1>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors p-2 rounded-md hover:bg-[var(--header-bg)]"
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          <button
            onClick={lock}
            className="bg-[var(--header-bg)] text-[var(--text-muted)] border border-[var(--border)] px-3 py-2 rounded-md text-sm hover:text-[var(--text-main)] hover:border-[var(--accent)] transition-colors whitespace-nowrap"
          >
            Lock
          </button>
          <button
            onClick={addRow}
            className="bg-[var(--btn-bg)] text-[var(--btn-text)] px-3 sm:px-4 py-2 rounded-md font-bold text-sm hover:-translate-y-0.5 transition-transform shadow-md whitespace-nowrap"
          >
            + Add
          </button>
        </div>
      </header>

      {/* ─── Mobile: accordion rows ─── */}
      <div ref={scrollRef} className="flex-grow overflow-y-auto pb-12 md:hidden">
        {entries.length === 0 && (
          <p className="text-center text-[var(--text-muted)] mt-8">No entries yet</p>
        )}

        {entries.map((entry) => {
          const isExpanded = expandedId === entry.id;
          const colorConfig = entry.row_color && entry.row_color !== 'none'
            ? ROW_COLORS[entry.row_color]
            : null;

          return (
            <div
              key={entry.id}
              className={`row-entry ${isExpanded ? 'row-expanded' : 'row-collapsed'}`}
              style={{
                borderLeftColor: colorConfig?.bg || 'var(--border)',
                backgroundColor: isExpanded ? (colorConfig?.bg || 'var(--bg-color)') : 'transparent',
              }}
            >
              <div className="row-preview" onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
                <div className="row-preview-top">
                  <div className="row-preview-meta" style={{ color: colorConfig?.text || 'var(--text-muted)' }}>
                    <span className="row-preview-day" style={{ color: colorConfig?.text || 'var(--text-main)' }}>
                      {entry.day_name?.slice(0, 3) || '—'}
                    </span>
                    <span>{entry.date || '—'}</span>
                    <span className="row-preview-season" style={{ color: colorConfig?.text || 'var(--accent)' }}>
                      {entry.season || '—'}
                    </span>
                    <span>{entry.time_string || '—'}</span>
                  </div>
                  <div className="row-preview-ctrl" onClick={(e) => e.stopPropagation()}>
                    <div className="row-preview-dots">
                      <RowActions
                        currentColor={entry.row_color}
                        onColorSelect={(color: string) => updateCell(entry.id, 'row_color', color)}
                        onDelete={() => deleteRow(entry.id)}
                        mobile
                      />
                    </div>
                    <span className={`row-chevron ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                  </div>
                </div>
                <div className={`row-preview-body ${isExpanded ? 'body-collapsed' : ''}`}>
                  <div className="row-preview-activity" style={{ color: colorConfig?.text || 'var(--text-main)' }}>
                    {entry.activity ? entry.activity.replace(/[#*_`]/g, '') : '—'}
                  </div>
                  <div className="row-preview-bottom">
                    {entry.detail && (
                      <span style={{ color: colorConfig?.text || 'var(--text-muted)' }}>{entry.detail}</span>
                    )}
                    {entry.place && (
                      <span style={{ color: colorConfig?.text || 'var(--text-muted)' }}>{entry.place}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className={`row-detail ${isExpanded ? 'row-detail-open' : ''}`}>
                <div className="row-detail-inner">
                  <div className="row-detail-grid">
                    {COLUMNS.map((col) => (
                      <div key={col.key} className={`row-field ${col.key === 'activity' ? 'row-field-full' : ''}`}>
                        <label className="row-field-label">{col.label}</label>
                        <div style={{ color: colorConfig?.text || 'var(--text-main)' }}>
                          <EditableCell
                            value={entry[col.key] || ''}
                            onSave={(v: string) => updateCell(entry.id, col.key, v)}
                            markdown={col.key === 'activity'}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Desktop: full table ─── */}
      <div className="hidden md:flex md:flex-col md:flex-grow md:overflow-y-auto md:overflow-x-hidden md:pb-12">
        <table className="w-full table-fixed border-collapse">
          <thead className="sticky top-0 bg-[var(--header-bg)] z-10 shadow-sm">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="text-left py-3 px-2 text-xs uppercase font-bold text-[var(--text-muted)] border-b-2 border-r border-[var(--border)]"
                  style={{ width: col.width }}
                >
                  {col.label}
                </th>
              ))}
              <th className="w-[3%] py-3 px-1 text-center text-xs text-[var(--text-muted)] border-b-2 border-r border-[var(--border)]">
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const colorConfig = entry.row_color && entry.row_color !== 'none'
                ? ROW_COLORS[entry.row_color]
                : null;

              return (
                <tr
                  key={entry.id}
                  className="group transition-colors"
                  style={{ backgroundColor: colorConfig?.bg || 'transparent' }}
                >
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className="py-2 px-2 text-sm border-b border-r border-[var(--border)] align-top"
                      style={{ color: colorConfig?.text || 'var(--text-main)' }}
                    >
                      {col.key === 'activity' ? (
                        <EditableCell value={entry[col.key] || ''} onSave={(v: string) => updateCell(entry.id, col.key, v)} markdown />
                      ) : (
                        <EditableCell value={entry[col.key] || ''} onSave={(v: string) => updateCell(entry.id, col.key, v)} />
                      )}
                    </td>
                  ))}
                  <td className="py-2 px-1 border-b border-r border-[var(--border)] text-center align-middle">
                    <RowActions
                      currentColor={entry.row_color}
                      onColorSelect={(color: string) => updateCell(entry.id, 'row_color', color)}
                      onDelete={() => deleteRow(entry.id)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSetAutoLockTimeout={setAutoLockTimeout}
      />

      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </div>
  );
}
