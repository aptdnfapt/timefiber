import { useState, useRef, useEffect, useCallback } from 'react';
import { renderMarkdown } from '../lib/markdown';
import LightboxInline from './ImageLightbox';

interface EditableCellProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  markdown?: boolean;
}

async function uploadImage(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append('image', blob);
  const token = localStorage.getItem('auth_token');
  const res = await fetch('/api/uploads', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) throw new Error('Upload failed');
  const data = await res.json();
  return data.url;
}

function insertTextAtCursor(_el: HTMLElement, text: string) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

export default function EditableCell({
  value,
  onSave,
  className = '',
  markdown = false
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRef = useRef(false);

  const handleImageBlob = useCallback(async (blob: Blob) => {
    if (!divRef.current) return;
    try {
      const url = await uploadImage(blob);
      insertTextAtCursor(divRef.current, `![](${url})`);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (editing && divRef.current) {
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

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as string;
      if (detail) setLightboxSrc(detail);
    };
    window.addEventListener('lightbox-open', handler);
    return () => window.removeEventListener('lightbox-open', handler);
  }, []);

  const handleBlur = () => {
    if (savedRef.current) return;
    savedRef.current = true;
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

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        handleImageBlob(items[i].getAsFile()!);
        return;
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith('image/')) {
        handleImageBlob(files[i]);
        return;
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileChange = () => {
    const file = fileInputRef.current?.files?.[0];
    if (file) handleImageBlob(file);
  };

  if (editing) {
    return (
      <div className="relative">
        <div
          ref={divRef}
          contentEditable
          suppressContentEditableWarning
          className={`outline-none min-h-[1.4em] cursor-text p-1 pr-10 rounded whitespace-pre-wrap ${className}`}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          className="absolute bottom-1 right-1 w-6 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--header-bg)] transition-colors"
          title="Attach image"
          onClick={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21,15 16,10 5,21"/>
          </svg>
        </button>
      </div>
    );
  }

  const displayMd = markdown && value ? renderMarkdown(value) : null;

  return (
    <>
      {lightboxSrc && (
        <LightboxInline src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
      {displayMd ? (
        <div
          onClick={() => setEditing(true)}
          className={`cursor-text min-h-[1.4em] hover:bg-[var(--header-bg)]/60 p-1 rounded transition-colors ${className}`}
          dangerouslySetInnerHTML={{ __html: displayMd }}
        />
      ) : (
        <div
          onClick={() => setEditing(true)}
          className={`cursor-text min-h-[1.4em] hover:bg-[var(--header-bg)]/60 p-1 rounded transition-colors whitespace-pre-wrap ${className}`}
        >
          {value || <span className="opacity-30">&nbsp;</span>}
        </div>
      )}
    </>
  );
}