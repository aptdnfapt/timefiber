import { useState } from 'react';
import { ROW_COLORS } from '../types';

interface ColorPickerProps {
  currentColor: string | null;
  onSelect: (color: string) => void;
}

export default function ColorPicker({ currentColor, onSelect }: ColorPickerProps) {
  const [open, setOpen] = useState(false);

  const colors = Object.entries(ROW_COLORS);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="w-6 h-6 rounded-full border-2 border-[var(--border)] transition-transform hover:scale-110"
        style={{
          backgroundColor: currentColor && currentColor !== 'none' 
            ? ROW_COLORS[currentColor]?.bg 
            : 'transparent',
          borderColor: currentColor && currentColor !== 'none'
            ? ROW_COLORS[currentColor]?.bg
            : 'var(--border)'
        }}
        title="Change row color"
      />
      
      {open && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setOpen(false)} 
          />
          <div className="absolute z-50 right-0 mt-1 bg-[var(--bg-color)] border border-[var(--border)] rounded-md shadow-lg p-2 flex flex-col gap-1 min-w-[120px]">
            {colors.map(([key, { name, bg, text }]) => (
              <button
                key={key}
                onClick={() => {
                  onSelect(key);
                  setOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded hover:opacity-80 transition-opacity text-left text-sm"
                style={{ 
                  backgroundColor: bg, 
                  color: text,
                  border: key === 'none' ? '1px dashed var(--border)' : 'none'
                }}
              >
                <span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: bg }} />
                {name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
