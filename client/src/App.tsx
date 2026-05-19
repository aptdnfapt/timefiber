import { useState, useEffect, useRef, useCallback } from 'react';
import { Entry, ROW_COLORS } from './types';
import { api } from './api';
import Login from './components/Login';
import ThemeSelector from './components/ThemeSelector';
import EditableCell from './components/EditableCell';
import RowActions from './components/RowActions';

const COLUMNS = [
  { key: 'week_number' as const, label: 'Week No', width: '5%' },
  { key: 'month_number' as const, label: 'Month No', width: '5%' },
  { key: 'date' as const, label: 'Date', width: '5%' },
  { key: 'day_name' as const, label: 'Day Name', width: '7.5%' },
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
  const scrollRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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

    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
      const cell = document.getElementById(`activity-${newEntry.id}`);
      cell?.focus();
    }, 50);
  };

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
      {/* Header */}
      <header className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b-2 border-[var(--accent)] gap-4">
        <h1 className="font-playfair text-2xl sm:text-3xl text-[var(--text-main)] flex items-center gap-3">
          LogTracker
          <span className="text-[var(--accent)] italic font-playfair text-lg">/ Season</span>
        </h1>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <ThemeSelector />
          <button
            onClick={addRow}
            className="bg-[var(--btn-bg)] text-[var(--btn-text)] px-4 py-2 rounded-md font-bold text-sm hover:-translate-y-0.5 transition-transform shadow-md whitespace-nowrap"
          >
            + Add New Row
          </button>
        </div>
      </header>

      {/* Table */}
      <div ref={scrollRef} className="flex-grow overflow-y-auto overflow-x-hidden pb-12">
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
                  style={{
                    backgroundColor: colorConfig?.bg || 'transparent',
                  }}
                >
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className="py-2 px-2 text-sm border-b border-r border-[var(--border)] align-top"
                      style={{ color: colorConfig?.text || 'var(--text-main)' }}
                    >
                      {col.key === 'activity' ? (
                        <EditableCell
                          value={entry[col.key] || ''}
                          onSave={(v: string) => updateCell(entry.id, col.key, v)}
                          markdown
                        />
                      ) : (
                        <EditableCell
                          value={entry[col.key] || ''}
                          onSave={(v: string) => updateCell(entry.id, col.key, v)}
                        />
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
    </div>
  );
}
