import { useState, useRef, useEffect, useCallback } from 'react';
import { renderMarkdown } from '../lib/markdown';
import ImageGalleryModal from './ImageGalleryModal';

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

/**
 * Save the current selection range so we can restore it later after async ops.
 * Returns null if the selection is not inside the given container.
 */
function saveRange(container: HTMLElement): Range | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return null;
  return range.cloneRange();
}

/**
 * Restore a saved range; if restoration fails (container lost focus, etc)
 * and fallbackContainer is provided, append text at the end instead.
 */
function restoreAndInsertText(container: HTMLElement, savedRange: Range | null, text: string) {
  const sel = window.getSelection();
  if (savedRange && container.contains(savedRange.commonAncestorContainer)) {
    // Create a fresh range from the saved one to avoid issues
    const range = document.createRange();
    try {
      range.setStart(savedRange.startContainer, savedRange.startOffset);
      range.setEnd(savedRange.endContainer, savedRange.endOffset);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
      return;
    } catch {
      // fall through to append
    }
  }
  // Append at end of container
  const textNode = document.createTextNode(text);
  container.appendChild(textNode);
  // Place cursor after inserted text
  const range = document.createRange();
  range.selectNodeContents(container);
  range.collapse(false);
  sel?.removeAllRanges();
  sel?.addRange(range);
}

export default function EditableCell({
  value,
  onSave,
  className = '',
  markdown = false
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const divRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef(false);
  const savedRangeRef = useRef<Range | null>(null);

  const handleImageUrl = useCallback((url: string) => {
    if (!divRef.current) return;
    restoreAndInsertText(divRef.current, savedRangeRef.current, `![](${url})`);
    setGalleryOpen(false);
    savedRangeRef.current = null;
    // Keep editing mode active, focus back into the div
    setTimeout(() => {
      divRef.current?.focus();
      // Update saved range to new cursor position
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const r = sel.getRangeAt(0);
      if (divRef.current && divRef.current.contains(r.commonAncestorContainer)) {
        savedRangeRef.current = r.cloneRange();
      }
    }, 0);
  }, []);

  const handleImageBlob = useCallback(async (blob: Blob) => {
    if (!divRef.current) return;
    setUploading(true);
    try {
      const url = await uploadImage(blob);
      restoreAndInsertText(divRef.current, savedRangeRef.current, `![](${url})`);
    } catch {
      // silently fail
    } finally {
      setUploading(false);
      savedRangeRef.current = null;
      setTimeout(() => divRef.current?.focus(), 0);
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
  }, [editing, value]);

  useEffect(() => {
    if (!editing) return;
    const onSelectionChange = () => {
      if (!divRef.current) return;
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      if (divRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [editing]);

  const handleBlur = () => {
    if (savedRef.current) return;
    if (galleryOpen) {
      // Don't blur when gallery is open; blur will come when gallery closes
      return;
    }
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
        savedRangeRef.current = saveRange(divRef.current!);
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
        savedRangeRef.current = saveRange(divRef.current!);
        handleImageBlob(files[i]);
        return;
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleGallerySelect = (url: string) => {
    handleImageUrl(url);
  };

  const handleAttachClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    savedRangeRef.current = saveRange(divRef.current!);
    setGalleryOpen(true);
  };

  if (editing) {
    return (
      <div className="relative">
        <div
          ref={divRef}
          contentEditable={!uploading}
          suppressContentEditableWarning
          className={`outline-none min-h-[1.4em] cursor-text p-1 pr-10 rounded whitespace-pre-wrap ${className}`}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        />
        <button
          className="absolute bottom-1 right-1 w-6 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--header-bg)] transition-colors"
          title="Attach image"
          onMouseDown={(e) => { e.preventDefault(); }}
          onClick={handleAttachClick}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21,15 16,10 5,21"/>
          </svg>
        </button>
        {uploading && (
          <div className="absolute inset-0 bg-[var(--bg-color)]/50 flex items-center justify-center rounded z-10">
            <svg className="animate-spin h-5 w-5 text-[var(--accent)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        )}

        <ImageGalleryModal
          open={galleryOpen}
          onClose={() => {
            setGalleryOpen(false);
            savedRangeRef.current = null;
            // re-focus cell after closing gallery
            setTimeout(() => divRef.current?.focus(), 0);
          }}
          onSelect={handleGallerySelect}
        />
      </div>
    );
  }

  const displayMd = markdown && value ? renderMarkdown(value) : null;

  return (
    <>
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
