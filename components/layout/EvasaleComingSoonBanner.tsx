import React from 'react';

/** Launch notice mounted once below the global header in the root layout. */
export function EvasaleComingSoonBanner() {
  return (
    <div role="status" aria-label="Evasale launch notice" className="w-full border-b border-yellow-700 bg-yellow-300 px-4 py-2 text-center text-sm font-semibold text-yellow-950">
      Evasale is coming soon
    </div>
  );
}
