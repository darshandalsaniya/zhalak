import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { effectivePrice, formatInr } from '@/lib/catalog-demo';
import { useDemo, useNow, catalogOf, setDemo, tr, type Order } from '@/lib/store';

export default function Cart() {
  const s = useDemo();
  const now = useNow();
  const [, go] = useLocation();
  const [err, setErr] = useState<string | null>(null);
  const L = s.lang; const hi = L === 'hi';
  const all = catalogOf(s);
  const lines = s.cart.map((c) => ({ c, p: all.find((p) => p.id === c.id) })).filter((x) => x.p);
  const total = lines.reduce((a, { c, p }) => a + c.qty * effectivePrice(p!, now), 0);

  const setQty = (id: string, qty: number) => setDemo((x) => ({ ...x, cart: qty <= 0 ? x.cart.filter((c) => c.id !== id) : x.cart.map((c) => (c.id === id ? { ...c, qty } : c)) }));

  const checkout = () => {
    const short = lines.find(({ c, p }) => c.qty > p!.stock);
    if (short) { setErr(`Only ${short.p!.stock} of "${short.p!.title}" left. Adjust the quantity.`); return; }
    const t = Date.now();
    const order: Order = {
      id: `CL-${String(t).slice(-5)}`, createdAt: t,
      lines: lines.map(({ c, p }) => ({ id: p!.id, title: p!.title, titleHi: p!.titleHi, image: p!.image, qty: c.qty, unitPrice: effectivePrice(p!, t) })),
      total: 0,
    };
    order.total = order.lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
    const dec = (arr: typeof s.seeds) => arr.map((p) => { const l = s.cart.find((c) => c.id === p.id); return l ? { ...p, stock: p.stock - l.qty } : p; });
    setDemo((x) => ({ ...x, seeds: dec(x.seeds), published: dec(x.published), cart: [], orders: [order, ...x.orders] }));
    go(`/order/${order.id}`);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl font-bold">{tr(L, 'bag')}</h1>
      {lines.length === 0 ? (
        <div data-testid="empty-cart" className="mt-8 grid place-items-center rounded-3xl border border-dashed p-12 text-center">
          <ShoppingBag className="h-8 w-8 text-primary" />
          <p className="mt-3 font-semibold">{hi ? 'थैला खाली है' : 'Your bag is empty'}</p>
          <Link href="/shop" data-testid="link-browse" className="mt-4 rounded-full bg-primary px-5 py-2 font-semibold text-primary-foreground">{hi ? 'दुकान देखें' : 'Browse the shop'}</Link>
        </div>
      ) : (
        <>
          <div className="mt-6 divide-y rounded-3xl border bg-card">
            {lines.map(({ c, p }) => (
              <div key={c.id} data-testid={`row-cart-${c.id}`} className="flex items-center gap-4 p-4">
                <img src={p!.image} alt="" className="h-20 w-16 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{hi ? p!.titleHi : p!.title}</p>
                  <p className="font-mono text-sm">{formatInr(effectivePrice(p!, now))}</p>
                  <p className="text-xs text-muted-foreground">{p!.stock} {tr(L, 'left')}</p>
                </div>
                <div className="flex items-center gap-1 rounded-full border p-1">
                  <button data-testid={`button-dec-${c.id}`} onClick={() => setQty(c.id, c.qty - 1)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted"><Minus className="h-3 w-3" /></button>
                  <span className="w-6 text-center font-mono text-sm">{c.qty}</span>
                  <button data-testid={`button-inc-${c.id}`} disabled={c.qty >= p!.stock} onClick={() => setQty(c.id, c.qty + 1)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted disabled:opacity-30"><Plus className="h-3 w-3" /></button>
                </div>
                <button data-testid={`button-remove-${c.id}`} onClick={() => setQty(c.id, 0)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-3xl bg-secondary p-6 text-secondary-foreground">
            <div className="flex items-baseline justify-between"><span>{tr(L, 'total')}</span><span data-testid="text-total" className="font-mono text-3xl">{formatInr(total)}</span></div>
            <p className="mt-2 text-xs opacity-80">Simulated checkout. No payment is taken, no details are collected, and nothing ships. Stock updates only in this browser.</p>
            {err && <p data-testid="text-checkout-error" className="mt-3 rounded-xl bg-background/15 p-2 text-sm">{err}</p>}
            <button data-testid="button-checkout" onClick={checkout} className="mt-4 w-full rounded-full bg-accent py-3 font-bold text-accent-foreground transition hover:-translate-y-0.5">{tr(L, 'checkout')}</button>
          </div>
        </>
      )}
    </div>
  );
}
