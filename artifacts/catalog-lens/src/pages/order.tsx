import { Link, useParams } from 'wouter';
import { CheckCircle2 } from 'lucide-react';
import { formatInr } from '@/lib/catalog-demo';
import { useDemo } from '@/lib/store';

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const s = useDemo();
  const o = s.orders.find((x) => x.id === id);
  const hi = s.lang === 'hi';
  if (!o) return <div className="mx-auto max-w-md px-4 py-20 text-center"><p className="font-display text-3xl font-bold">Order not found</p><Link href="/shop" className="mt-4 inline-block underline">Back to shop</Link></div>;
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="rise overflow-hidden rounded-[2rem] border bg-card">
        <div className="relative bg-primary p-8 text-primary-foreground">
          <div className="bandhani absolute inset-0 opacity-30" />
          <CheckCircle2 className="relative h-10 w-10" />
          <h1 className="relative mt-3 font-display text-3xl font-bold">{hi ? 'डेमो ऑर्डर हो गया' : 'Demo order placed'}</h1>
          <p data-testid="text-order-id" className="relative mt-1 font-mono text-sm opacity-85">{o.id}</p>
        </div>
        <div className="divide-y">
          {o.lines.map((l) => (
            <div key={l.id} className="flex items-center gap-3 p-4">
              <img src={l.image} alt="" className="h-14 w-12 rounded-lg object-cover" />
              <span className="flex-1 text-sm font-semibold">{l.qty} x {hi ? l.titleHi : l.title}</span>
              <span className="font-mono text-sm">{formatInr(l.qty * l.unitPrice)}</span>
            </div>
          ))}
          <div className="flex justify-between p-4 font-bold"><span>Total</span><span data-testid="text-order-total" className="font-mono">{formatInr(o.total)}</span></div>
        </div>
        <p className="bg-muted p-4 text-xs text-muted-foreground">Nothing was charged and nothing will ship. This order now appears in the seller studio in this browser.</p>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/" data-testid="link-seller-orders" className="rounded-full bg-secondary px-5 py-2.5 font-semibold text-secondary-foreground">See it in seller studio</Link>
        <Link href="/shop" data-testid="link-continue" className="rounded-full border px-5 py-2.5 font-semibold">Keep browsing</Link>
      </div>
    </div>
  );
}
