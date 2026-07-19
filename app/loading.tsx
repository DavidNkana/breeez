import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

/**
 * Root loading state — Next.js renders this while the page is
 * server-rendering. Keeps the chrome (header/footer) visible and
 * shows a friendly skeleton instead of a blank flash.
 */
export default function Loading() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10 pb-20 safe-bottom">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded bg-brand-100" />
          <div className="grid gap-6 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-square rounded-md bg-brand-100" />
                <div className="h-4 w-3/4 rounded bg-brand-100" />
                <div className="h-4 w-1/2 rounded bg-brand-100" />
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
