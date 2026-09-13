import Link from 'next/link';
import packageJson from '../../package.json';
import { brand } from '@/lib/brand';

const links = [
  ['About', '/about'], ['Contact', '/contact'], ['Privacy', '/legal/privacy'],
  ['Terms', '/legal/terms'], ['Returns', '/legal/returns'], ['Shipping', '/legal/shipping'],
] as const;

export function Footer() {
  return (
    <footer className="mt-16 border-t border-brand-800 bg-brand-900 md:mt-24">
      <div className="flex justify-center bg-black py-6">
        <img src={brand.logo} alt="Evasale" className="h-10 w-auto" />
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 py-7 text-sm text-brand-700">
        {links.map(([label, href]) => <Link key={href} href={href} className="hover:text-accent-600 hover:underline">{label}</Link>)}
        <span className="text-brand-500">v{packageJson.version}</span>
      </div>
      <div className="border-t border-brand-200 px-4 py-4 text-center text-xs text-brand-500">
        <p>{brand.copyrightLine.replace('{year}', String(new Date().getFullYear()))}</p>
        <p className="mt-1">Made with ♥ in South Africa</p>
      </div>
    </footer>
  );
}
