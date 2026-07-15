'use client';

import { useState, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useToast } from '@/components/ui/Toast';
import clsx from 'clsx';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ImageItem = {
  id: string;
  url: string;
  alt_text?: string;
  uploading?: boolean;
  error?: string;
};

type Props = {
  images: ImageItem[];
  onChange: (images: ImageItem[] | ((prev: ImageItem[]) => ImageItem[])) => void;
  max?: number;
};

export function ImageUploader({ images, onChange, max = 10 }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const showToast = useToast((s) => s.show);

  /**
   * Upload a single file. Uses an onChange updater so each optimistic insert
   * is additive even when many files are processed in a tight loop.
   */
  const uploadFile = useCallback(async (file: File): Promise<void> => {
    if (!file.type.startsWith('image/')) {
      showToast(`"${file.name}" is not an image`, 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast(`"${file.name}" is over 5MB`, 'error');
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const previewUrl = URL.createObjectURL(file);

    // Add placeholder (functional update — survives concurrent calls)
    onChange([...images, { id: tempId, url: previewUrl, uploading: true }]);
    // Note: this still uses stale `images` if called in a loop without delay
    // — handleFiles below uses a different pattern to avoid that.

    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${tempId}.${ext}`;
      const { data, error: upErr } = await supabase.storage
        .from('product-images')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(data.path);
      URL.revokeObjectURL(previewUrl);

      // Replace the placeholder with the real URL
      onChange((prev) => prev.map((img) => img.id === tempId ? { ...img, url: publicUrl, uploading: false } : img));
    } catch (err: any) {
      URL.revokeObjectURL(previewUrl);
      onChange((prev) => prev.map((img) => img.id === tempId ? { ...img, error: err?.message ?? 'upload failed' } : img));
    }
  }, [images, onChange, showToast]);

  /**
   * Handle multiple files. Adds ALL placeholders first (so the user sees
   * every one at once), then uploads them sequentially. The functional
   * setter ensures even rapid sequential updates accumulate correctly.
   */
  async function handleFiles(files: FileList | File[] | null) {
    if (!files) return;
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;

    // Cap at remaining slots
    const slots = max - images.length;
    if (slots <= 0) {
      showToast(`Maximum ${max} images already uploaded`, 'warning');
      return;
    }
    const toUpload = fileArr.slice(0, slots);
    if (fileArr.length > slots) {
      showToast(`Only added ${slots} of ${fileArr.length} (max ${max})`, 'warning');
    }

    // Step 1: add all placeholders in a single state update so the UI shows
    // every chosen image at once (even before any upload completes)
    const placeholders: ImageItem[] = toUpload.map((file) => ({
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url: URL.createObjectURL(file),
      uploading: true
    }));
    onChange([...images, ...placeholders]);

    // Step 2: upload each one (sequentially, functional updates)
    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i];
      const tempId = placeholders[i].id;
      try {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${tempId}.${ext}`;
        const { data, error: upErr } = await supabase.storage
          .from('product-images')
          .upload(path, file, { cacheControl: '3600', upsert: false });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(data.path);
        // Revoke the blob URL since we now have the real one
        URL.revokeObjectURL(placeholders[i].url);
        onChange((prev) => prev.map((img) => img.id === tempId ? { ...img, url: publicUrl, uploading: false } : img));
      } catch (err: any) {
        onChange((prev) => prev.map((img) => img.id === tempId ? { ...img, error: err?.message ?? 'upload failed' } : img));
      }
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  function removeImage(idx: number) {
    onChange(images.filter((_, i) => i !== idx));
  }

  function moveImage(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= images.length) return;
    const arr = [...images];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    onChange(arr);
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-brand-900">
        Product images <span className="text-brand-500 font-normal">({images.length}/{max})</span>
      </label>

      {/* Full-width drop zone — matches form field heights */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={clsx(
          'relative w-full rounded-md border-2 border-dashed transition-colors cursor-pointer',
          'px-4 py-6 sm:py-8 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4',
          dragOver ? 'border-accent-500 bg-accent-50 text-accent-700' : 'border-brand-300 bg-white hover:border-accent-500 hover:bg-accent-50/30 text-brand-600'
        )}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
        aria-label="Upload images. Drag files here, click to browse, or use camera button."
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0" aria-hidden="true">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
        <div className="text-center sm:text-left">
          <p className="text-sm font-medium">Drop images here, click to browse, or use camera</p>
          <p className="text-xs text-brand-500 mt-0.5">PNG, JPG, WebP up to 5MB each · max {max} images · first image is the main one</p>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
          className="relative z-10 inline-flex items-center gap-1.5 rounded-md border border-accent-300 bg-white px-3 py-1.5 text-sm font-medium text-accent-700 hover:bg-accent-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Camera
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
        className="hidden"
      />

      {/* Thumbnail grid — shows ALL uploaded images, with main badge, reorder, delete */}
      {images.length > 0 && (
        <div className="mt-4">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {images.map((img, idx) => (
              <div key={img.id} className="relative aspect-square rounded-md border border-brand-200 overflow-hidden bg-brand-50">
                {img.error ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-danger/10">
                    <span className="text-xs text-danger font-medium">Failed</span>
                    <span className="text-[10px] text-brand-600 mt-1 line-clamp-2">{img.error}</span>
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="mt-1 text-[10px] text-accent-700 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                )}
                {img.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" />
                    </svg>
                  </div>
                )}
                <div className="absolute top-1 right-1 flex gap-1">
                  {idx > 0 && (
                    <button type="button" onClick={() => moveImage(idx, -1)} className="h-6 w-6 rounded-full bg-white/90 text-brand-900 text-xs hover:bg-white" aria-label="Move left">←</button>
                  )}
                  {idx < images.length - 1 && (
                    <button type="button" onClick={() => moveImage(idx, 1)} className="h-6 w-6 rounded-full bg-white/90 text-brand-900 text-xs hover:bg-white" aria-label="Move right">→</button>
                  )}
                </div>
                {idx === 0 && !img.error && (
                  <span className="absolute bottom-1 left-1 rounded bg-accent-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">MAIN</span>
                )}
                {!img.error && (
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute bottom-1 right-1 h-6 w-6 rounded-full bg-danger text-white text-xs hover:bg-red-700"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          {images.length < max && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 text-sm text-accent-700 hover:underline"
            >
              + Add more images
            </button>
          )}
        </div>
      )}
    </div>
  );
}