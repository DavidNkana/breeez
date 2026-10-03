'use client';

import { useEffect, useState } from 'react';
import { isNative } from '@/lib/platform';

/** Web-only launch notice. It is mounted once in the root layout. */
export function EvasaleComingSoonBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isNative());
  }, []);

  if (!visible) return null;

  return (
    <div role="status" aria-label="Evasale launch notice" className="w-full border-b border-yellow-700 bg-yellow-300 px-4 py-2 text-center text-sm font-semibold text-yellow-950">
      Evasale is coming soon
    </div>
  );
}
