'use client';

import { useState, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import clsx from 'clsx';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ImageItem = {
  id?: string;
  url: string;
  file?: File;
  uploading?: boolean;
  alt_text?: string;
};

type Props = {
  images: ImageItem[];
  onChange: (images: ImageItem[]) => void;
  max?: number;
};

export function ImageUploader({ images, onChange, max = 10 }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const showToast = useToast((s) => s.show);

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    if (images.length >= max) {
      showToast(`Maximum ${max} images`, 'warning');
      return null;
    }
    if (!file.type.startsWith('image/')) {
      showToast('Only image files allowed', 'error');
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB', 'error');
      return null;
    }

    // Optimistic: add placeholder
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const previewUrl = URL.createObjectURL(file);
    const newImages = [...images, { id: tempId, url: previewUrl, file, uploading: true }];
    onChange(newImages);

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${tempId}.${ext}`;
      const { data, error: upErr } = await supabase.storage
        .from('product-images')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (upErr) {
        showToast(`Upload failed: ${upErr.message}`, 'error');
        onChange(newImages.filter((img) => img.id !== tempId));
        return null;
      }

      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(data.path);
      URL.revokeObjectURL(previewUrl);

      // Replace placeholder with uploaded URL
      const replaced = newImages.map((img) =>
        img.id === tempId ? { ...img, url: publicUrl, file: undefined, uploading: false } : img
      );
      onChange(replaced);
      return publicUrl;
    } catch (err: any) {
      showToast(`Upload failed: ${err?.message ?? 'unknown error'}`, 'error');
      onChange(newImages.filter((img) => img.id !== tempId));
      return null;
    }
  }, [images, max, onChange, showToast]);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const remaining = max - images.length;
    const toUpload = Array.from(files).slice(0, remaining);
    for (const file of toUpload) {
      await uploadFile(file);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  function removeImage(idx: number) {
    const target = images[idx];
    if (target.file) URL.revokeObjectURL(target.url);
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
      <label className="mb-2 block text-sm font-medium text-brand-900">Product images ({images.length}/{max})</label>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {images.map((img, idx) => (
          <div key={img.id || img.url} className="relative aspect-square rounded-md border border-brand-200 overflow-hidden bg-brand-50">
            <img src={img.url} alt="" className="h-full w-full object-cover" />
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
                <button type="button" onClick={() => moveImage(idx, -1)} className="h-6 w-6 rounded-full bg-white/90 text-brand-900 text-xs hover:bg-white">←</button>
              )}
              {idx < images.length - 1 && (
                <button type="button" onClick={() => moveImage(idx, 1)} className="h-6 w-6 rounded-full bg-white/90 text-brand-900 text-xs hover:bg-white">→</button>
              )}
              {idx === 0 && (
                <span className="rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-semibold text-white">MAIN</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute bottom-1 right-1 h-6 w-6 rounded-full bg-danger text-white text-xs hover:bg-red-700"
              aria-label="Remove image"
            >
              ×
            </button>
          </div>
        ))}

        {images.length < max && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={(e) => {
              // Only trigger file picker if click target is the dropzone itself or its icon/label
              // (not the camera button which stops propagation)
              fileInputRef.current?.click();
            }}
            className={clsx(
              'relative aspect-square rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1 text-xs text-brand-500 transition-colors cursor-pointer',
              dragOver ? 'border-accent-500 bg-accent-50 text-accent-700' : 'border-brand-300 bg-white hover:border-accent-500 hover:bg-accent-50/30'
            )}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
            aria-label="Upload images. Drop files here, click to browse, or use camera button."
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            <span className="font-medium">Drop or click</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
              className="relative z-10 text-accent-700 hover:underline mt-1 px-2 py-0.5 rounded hover:bg-accent-100"
            >
              Use camera
            </button>
          </div>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      <p className="mt-2 text-xs text-brand-500">
        Up to {max} images. PNG, JPG, WebP. Max 5MB each. First image is the main product image.
      </p>
    </div>
  );
}