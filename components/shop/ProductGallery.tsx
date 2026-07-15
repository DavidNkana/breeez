'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { ProductImage } from '@/lib/supabase/types';

type ProductGalleryProps = {
  images: ProductImage[];
};

export function ProductGallery({ images }: ProductGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (images.length === 0) {
    return (
      <div className="aspect-square overflow-hidden rounded-lg bg-brand-100">
        <img src="/placeholder.svg" alt="No image" className="h-full w-full object-cover" />
      </div>
    );
  }

  const active = images[activeIdx];

  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-lg bg-brand-100">
        <img
          src={active.url}
          alt={active.alt_text || 'Product image'}
          className="h-full w-full object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={clsx(
                'aspect-square overflow-hidden rounded border-2',
                i === activeIdx ? 'border-brand-900' : 'border-transparent'
              )}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}