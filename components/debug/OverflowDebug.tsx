'use client';

import { useEffect, useState } from 'react';

/**
 * TEMP DEBUG: shows live viewport vs document width on mobile.
 * Fixed bottom-left chip — remove once PDP overflow is fixed.
 */
export function OverflowDebug() {
  const [info, setInfo] = useState('—');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      const vw = window.innerWidth;
      const docW = document.documentElement.scrollWidth;
      const bodyW = document.body.scrollWidth;
      const over = docW - vw;
      setInfo(
        `vw=${vw} docW=${docW} bodyW=${bodyW} over=${over}`
      );
    };
    update();
    window.addEventListener('resize', update);
    const id = setInterval(update, 1000);
    return () => {
      window.removeEventListener('resize', update);
      clearInterval(id);
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        zIndex: 99999,
        background: 'rgba(220, 38, 38, 0.95)',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: 10,
        padding: '2px 6px',
        maxWidth: '100vw',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      PDP-OVERFLOW-DEBUG: {info}
    </div>
  );
}
