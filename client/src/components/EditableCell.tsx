import { useState, useRef, useEffect } from 'react';
import { renderMarkdown } from '../lib/markdown';

interface EditableCellProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  markdown?: boolean;
}

export default function EditableCell({
  value,
  onSave,
  className = '',
  markdown = false
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const divRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    if (editing && divRef.current) {
      // convert \n to <br> nodes so contentEditable shows lines
      divRef.current.innerHTML = value.split('\n').map(line =>
        line || '<br>'
      ).join('<br>');
      divRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(divRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editing]);

  const handleBlur = () => {
    if (savedRef.current) return;
    savedRef.current = true;
    // innerText preserves newlines, textContent does not
    const text = divRef.current?.innerText || '';
    setEditing(false);
    onSave(text.trim());
    setTimeout(() => { savedRef.current = false; }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      divRef.current?.blur();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      divRef.current?.blur();
    }
  };

  if (editing) {
    return (
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        className={`outline-none min-h-[1.4em] cursor-text p-1 rounded whitespace-pre-wrap ${className}`}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    );
  }

  if (markdown && value) {
    const html = renderMarkdown(value);
    return (
      <div
        onClick={() => setEditing(true)}
        className={`cursor-text min-h-[1.4em] hover:bg-[var(--header-bg)]/60 p-1 rounded transition-colors ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className={`cursor-text min-h-[1.4em] hover:bg-[var(--header-bg)]/60 p-1 rounded transition-colors whitespace-pre-wrap ${className}`}
    >
      {value || <span className="opacity-30">&nbsp;</span>}
    </div>
  );
}
