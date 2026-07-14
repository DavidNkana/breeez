import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-brand-100 bg-brand-50 safe-bottom">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-4">
        <div>
          <p className="text-lg font-semibold text-brand-950">Breeez</p>
          <p className="mt-2 text-sm text-brand-600">Shop SA, all in one place.</p>
        </div>
        <div>
          <p className="font-medium text-brand-900">Shop</p>
          <ul className="mt-2 space-y-1 text-sm text-brand-600">
            <li><Link href="/c/apparel" className="hover:underline">Apparel</Link></li>
            <li><Link href="/c/kitchen" className="hover:underline">Kitchen</Link></li>
            <li><Link href="/c/home-decor" className="hover:underline">Home Decor</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-brand-900">Account</p>
          <ul className="mt-2 space-y-1 text-sm text-brand-600">
            <li><Link href="/auth/login" className="hover:underline">Sign in</Link></li>
            <li><Link href="/auth/register" className="hover:underline">Register</Link></li>
            <li><Link href="/account/orders" className="hover:underline">My orders</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-brand-900">Legal</p>
          <ul className="mt-2 space-y-1 text-sm text-brand-600">
            <li><Link href="/legal/terms" className="hover:underline">Terms</Link></li>
            <li><Link href="/legal/privacy" className="hover:underline">Privacy (POPIA)</Link></li>
            <li><Link href="/legal/returns" className="hover:underline">Returns</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-brand-100">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-brand-500">
          © {new Date().getFullYear()} Breeez. Prices in ZAR. POPIA-compliant.
        </p>
      </div>
    </footer>
  );
}