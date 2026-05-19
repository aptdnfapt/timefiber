import { useState, useRef, useEffect } from 'react';
import { ROW_COLORS } from '../types';

interface RowActionsProps {
  currentColor: string | null;
  onColorSelect: (color: string) => void;
  onDelete: () => void;
  mobile?: boolean;
}

export default function RowActions({ currentColor, onColorSelect, onDelete, mobile }: RowActionsProps) {
  const [open, setOpen] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowColors(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const close = () => {
    setOpen(false);
    setShowColors(false);
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => { setOpen(!open); setShowColors(false); }}
        className={`${mobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity text-[var(--text-muted)] hover:text-[var(--text-main)] text-lg leading-none px-1`}
        title="Row actions"
      >
        ⋮
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 bg-[var(--bg-color)] border border-[var(--border)] rounded-md shadow-lg py-1 min-w-[140px]">
          <button
            onClick={(e) => { e.stopPropagation(); setShowColors(!showColors); }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--header-bg)] flex items-center gap-2"
          >
            <span
              className="w-3 h-3 rounded-full border border-[var(--border)]"
              style={{ backgroundColor: currentColor && currentColor !== 'none' ? ROW_COLORS[currentColor]?.bg : 'transparent' }}
            />
            Color Row
          </button>

          {showColors && (
            <div className="px-2 py-1 flex flex-col gap-0.5">
              {Object.entries(ROW_COLORS).map(([key, { name, bg }]) => (
                <button
                  key={key}
                  onClick={(e) => { e.stopPropagation(); onColorSelect(key); close(); }}
                  className="flex items-center gap-2 px-2 py-1 text-xs rounded hover:opacity-80"
                  style={{ color: key === 'none' ? 'var(--text-muted)' : ROW_COLORS[key].text }}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: bg, border: key === 'none' ? '1px dashed var(--border)' : 'none' }}
                  />
                  {name}
                </button>
              ))}
            </div>
          )}

          <hr className="border-[var(--border)] my-1" />
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); close(); }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--header-bg)] text-[var(--del-btn)]"
          >
            Delete Row
          </button>
        </div>
      )}
    </div>
  );
}
