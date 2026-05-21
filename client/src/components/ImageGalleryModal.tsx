import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

interface ImageItem {
  uuid: string;
  url: string;
}

interface ImageGalleryModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export default function ImageGalleryModal({ open, onClose, onSelect }: ImageGalleryModalProps) {
  const [tab, setTab] = useState<'gallery' | 'upload'>('gallery');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setTab('gallery');
      fetchedRef.current = false;
      return;
    }
    // fetch images on open
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      setLoading(true);
      api.getImages()
        .then((data) => setImages(data.images))
        .catch(() => setImages([]))
        .finally(() => setLoading(false));
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const form = new FormData();
    form.append('image', file);
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      // refresh gallery then switch to it
      const list = await api.getImages();
      setImages(list.images);
      setTab('gallery');
      // notify parent with the new url
      onSelect(data.url);
    } catch {
      // silently fail
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleFileChange = () => {
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      fileInputRef.current!.value = '';
      handleUpload(file);
    }
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
        className="relative rounded-xl shadow-2xl border border-[var(--border)] w-full max-w-lg mx-4 overflow-hidden"
        style={{ backgroundColor: 'var(--bg-color)' }}
      >
        {/* X close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors text-xl leading-none w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--header-bg)] z-10"
        >
          &times;
        </button>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
          <button
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === 'gallery'
                ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[var(--header-bg)]/40'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
            onClick={() => setTab('gallery')}
          >
            Gallery
          </button>
          <button
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === 'upload'
                ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[var(--header-bg)]/40'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
            onClick={() => setTab('upload')}
          >
            Upload
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {tab === 'gallery' && (
            <div>
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
                <div className="grid grid-cols-4 gap-2">
                  {images.map((img) => (
                    <button
                      key={img.uuid}
                      className="group relative aspect-square rounded-md overflow-hidden border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
                      onClick={() => onSelect(img.url)}
                    >
                      <img
                        src={`${img.url}.webp`}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'upload' && (
            <div
              className={`flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-lg transition-colors ${
                dragActive ? 'border-[var(--accent)] bg-[var(--header-bg)]/30' : 'border-[var(--border)]'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <svg className="w-10 h-10 text-[var(--text-muted)] mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 12l-3-3m0 0l3-3m-3 3h13.5" />
              </svg>
              <p className="text-sm text-[var(--text-muted)] mb-3">Drop image here or click to browse</p>
              <button
                className="text-xs bg-[var(--header-bg)] text-[var(--text-main)] border border-[var(--border)] px-3 py-1.5 rounded hover:border-[var(--accent)] transition-colors"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                Browse files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {uploading && (
                <div className="mt-4 flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-[var(--accent)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-xs text-[var(--text-muted)]">Uploading...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
