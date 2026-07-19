'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

type FlyItem = {
  id: string;
  imageUrl: string;
  fromRect: DOMRect;
  toRect: DOMRect;
};

type CartFlyContextValue = {
  fly: (item: Omit<FlyItem, 'id'>) => void;
};

const CartFlyContext = createContext<CartFlyContextValue | null>(null);

export function useCartFly() {
  const ctx = useContext(CartFlyContext);
  if (!ctx) throw new Error('useCartFly must be used inside CartFlyProvider');
  return ctx;
}

/**
 * Provides a "fly-to-cart" animation overlay. Mount once in the root
 * layout (or wherever the cart icon lives). Components that add to cart
 * call `fly({ imageUrl, fromRect, toRect })` and a thumbnail arcs to
 * the cart icon — a delight moment that signals the action.
 */
export function CartFlyProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<FlyItem[]>([]);
  const idRef = useRef(0);

  const fly = useCallback((item: Omit<FlyItem, 'id'>) => {
    const id = `fly-${idRef.current++}`;
    setItems((prev) => [...prev, { id, ...item }]);
  }, []);

  function complete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <CartFlyContext.Provider value={{ fly }}>
      {children}
      <FlyLayer items={items} onDone={complete} />
    </CartFlyContext.Provider>
  );
}

function FlyLayer({ items, onDone }: { items: FlyItem[]; onDone: (id: string) => void }) {
  return (
    <>
      {items.map((it) => (
        <FlyItem_ key={it.id} item={it} onDone={() => onDone(it.id)} />
      ))}
    </>
  );
}

function FlyItem_({ item, onDone }: { item: FlyItem; onDone: () => void }) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const from = item.fromRect;
    const to = item.toRect;

    const startX = from.left + from.width / 2;
    const startY = from.top + from.height / 2;
    const endX = to.left + to.width / 2;
    const endY = to.top + to.height / 2;

    const dx = endX - startX;
    const dy = endY - startY;

    // Set initial position
    el.style.transition = 'none';
    el.style.transform = `translate(-50%, -50%) scale(1)`;
    el.style.left = `${startX}px`;
    el.style.top = `${startY}px`;
    el.style.opacity = '1';

    // Force layout, then animate
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!el) return;
        el.style.transition =
          'left 700ms cubic-bezier(0.5, -0.2, 0.7, 0.5), top 700ms cubic-bezier(0.5, -0.2, 0.7, 0.5), transform 700ms cubic-bezier(0.5, -0.2, 0.7, 0.5), opacity 500ms ease-out 200ms';
        el.style.transform = `translate(-50%, -50%) scale(0.18) rotate(${
          dx > 0 ? '-15deg' : '15deg'
        })`;
        el.style.left = `${endX}px`;
        el.style.top = `${endY}px`;
      });
    });

    const t = setTimeout(() => {
      onDone();
      // Dispatch the cart-bounce event so the cart icon pulses
      window.dispatchEvent(new CustomEvent('breeez:cart-bounce'));
    }, 720);

    return () => clearTimeout(t);
  }, [item, onDone]);

  return (
    <div
      ref={elRef}
      className="pointer-events-none fixed z-[100] h-12 w-12 overflow-hidden rounded-md shadow-xl ring-2 ring-accent-500"
      style={{ willChange: 'transform, left, top, opacity' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.imageUrl || '/placeholder.svg'} alt="" className="h-full w-full object-cover" />
    </div>
  );
}
