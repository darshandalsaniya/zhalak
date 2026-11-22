import { type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { ShoppingBag, Store, Clapperboard, RotateCcw } from 'lucide-react';
import { effectivePrice, formatInr, type Product } from '@/lib/catalog-demo';
import { useDemo, setDemo, resetDemo, tr, fmtClock, type Lang } from '@/lib/store';

export function Shell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const s = useDemo();
  const count = s.cart.reduce((a, c) => a + c.qty, 0);
  const buyer = loc !== '/';
  const tab = (href: string, label: string, shortLabel: string, icon: ReactNode, active: boolean, id: string) => (
    <Link href={href} aria-label={label} aria-current={active ? 'page' : undefined} data-testid={id}
      className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-2 text-xs font-semibold transition sm:gap-2 sm:px-4 sm:text-sm ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/70 hover:bg-muted'}`}>
      {icon}<span className="sm:hidden">{shortLabel}</span><span className="hidden sm:inline">{label}</span>
    </Link>
  );
  return (
    <div className="grain min-h-[100dvh] bg-background">
      <div className="zari" />
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
          <Link href="/" className="flex shrink-0 items-center gap-1.5 sm:gap-2" data-testid="link-home">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-primary bandhani text-primary-foreground sm:h-9 sm:w-9">
              <span className="font-display text-lg leading-none">c</span>
            </span>
            <span className="font-display text-base font-bold tracking-tight sm:text-xl">CatalogLens</span>
          </Link>
          <nav className="ml-auto flex items-center gap-1 rounded-full border bg-card p-1">
            {tab('/', 'Seller studio', 'Studio', <Clapperboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />, loc === '/', 'link-studio')}
            {tab('/shop', 'Buyer shop', 'Shop', <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4" />, buyer && loc !== '/cart', 'link-shop')}
          </nav>
          {buyer && (
            <button data-testid="button-lang" onClick={() => setDemo((x) => ({ ...x, lang: (x.lang === 'en' ? 'hi' : 'en') as Lang }))}
              className="hidden rounded-full border px-3 py-2 text-sm font-semibold hover:bg-muted sm:block">
              {s.lang === 'en' ? 'हिंदी' : 'English'}
            </button>
          )}
          <Link href="/cart" aria-label={tr(s.lang, 'bag')} data-testid="link-cart" className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border bg-card hover:bg-muted">
            <ShoppingBag className="h-4 w-4" />
            {count > 0 && <span data-testid="text-cart-count" className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold">{count}</span>}
          </Link>
        </div>
        {buyer && (
          <div className="flex justify-center pb-2 sm:hidden">
            <button data-testid="button-lang-mobile" onClick={() => setDemo((x) => ({ ...x, lang: (x.lang === 'en' ? 'hi' : 'en') as Lang }))} className="rounded-full border px-3 py-1 text-xs font-semibold">
              {s.lang === 'en' ? 'हिंदी में देखें' : 'View in English'}
            </button>
          </div>
        )}
      </header>
      <main>{children}</main>
      <footer className="mx-auto mt-16 flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t px-4 py-6 text-xs text-muted-foreground">
        <p>Demo prototype. The bundled sample uses prepared captions. In the private preview, Sarvam analyzes audio from your clips. Catalog data stays in this browser. No real payments or orders.</p>
        <button data-testid="button-reset" onClick={() => { if (confirm('Reset the whole demo in this browser?')) resetDemo(); }} className="flex items-center gap-1 rounded-full border px-3 py-1.5 hover:bg-muted">
          <RotateCcw className="h-3 w-3" /> Reset demo
        </button>
      </footer>
    </div>
  );
}

export function Countdown({ endsAt, now, lang }: { endsAt: number; now: number; lang: Lang }) {
  const left = (endsAt - now) / 1000;
  if (left <= 0) return null;
  return (
    <span data-testid="text-countdown" className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">
      {tr(lang, 'dealEnds')} <span className="font-mono">{fmtClock(left)}</span>
    </span>
  );
}

export function PriceTag({ p, now, big }: { p: Product; now: number; big?: boolean }) {
  const eff = effectivePrice(p, now);
  const deal = eff < p.originalPrice;
  return (
    <div className="flex items-baseline gap-2">
      <span data-testid={`text-price-${p.id}`} className={`font-mono font-medium ${big ? 'text-3xl' : 'text-lg'} ${deal ? 'text-primary' : ''}`}>{formatInr(eff)}</span>
      {deal && <span className="font-mono text-sm text-muted-foreground line-through">{formatInr(p.originalPrice)}</span>}
    </div>
  );
}
