import { useRef } from 'react';
import { Link, useParams } from 'wouter';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { SAMPLE_VIDEO, SAMPLE_CAPTIONS } from '@/lib/catalog-demo';
import { useDemo, useNow, catalogOf, setDemo, tr, fmtClock } from '@/lib/store';
import { Countdown, PriceTag } from '@/components/shell';
import { useToast } from '@/hooks/use-toast';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const s = useDemo();
  const now = useNow();
  const { toast } = useToast();
  const vid = useRef<HTMLVideoElement>(null);
  const p = catalogOf(s).find((x) => x.id === id);
  const L = s.lang; const hi = L === 'hi';

  if (!p) return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="font-display text-3xl font-bold">This piece is not in the shop</p>
      <p className="mt-2 text-muted-foreground">It may have been reset. Head back to browse.</p>
      <Link href="/shop" className="mt-5 inline-block rounded-full bg-primary px-5 py-2 font-semibold text-primary-foreground">Back to shop</Link>
    </div>
  );

  const inCart = s.cart.find((c) => c.id === p.id)?.qty ?? 0;
  const canAdd = inCart < p.stock;
  const add = () => {
    setDemo((x) => {
      const ex = x.cart.find((c) => c.id === p.id);
      return { ...x, cart: ex ? x.cart.map((c) => (c.id === p.id ? { ...c, qty: c.qty + 1 } : c)) : [...x.cart, { id: p.id, qty: 1 }] };
    });
    toast({ title: hi ? 'थैले में डाला गया' : 'Added to bag', description: hi ? p.titleHi : p.title });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/shop" data-testid="link-back" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-foreground/70 hover:text-foreground"><ArrowLeft className="h-4 w-4" /> {tr(L, 'shop')}</Link>
      <div className="grid gap-8 md:grid-cols-2">
        <img src={p.image} alt={p.title} className="rise aspect-[4/5] w-full rounded-[2rem] object-cover" />
        <div className="rise space-y-5" style={{ animationDelay: '.1s' }}>
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-secondary">{tr(L, p.category)}</p>
          <h1 data-testid="text-title" className={`text-3xl font-bold leading-tight md:text-5xl ${hi ? '' : 'font-display'}`}>{hi ? p.titleHi : p.title}</h1>
          <PriceTag p={p} now={now} big />
          {p.offerEndsAt && <Countdown endsAt={p.offerEndsAt} now={now} lang={L} />}
          <p className="text-foreground/80">{hi ? p.descriptionHi : p.description}</p>
          {(p.material || p.color) && <dl className="grid grid-cols-2 gap-3 text-sm">
            {p.material && <div className="rounded-2xl bg-muted p-3"><dt className="text-xs text-muted-foreground">{tr(L, 'material')}</dt><dd className="font-semibold">{p.material}</dd></div>}
            {p.color && <div className="rounded-2xl bg-muted p-3"><dt className="text-xs text-muted-foreground">{tr(L, 'color')}</dt><dd className="font-semibold">{p.color}</dd></div>}
          </dl>}
          <div className="flex items-center gap-3">
            <button data-testid="button-add-cart" disabled={!canAdd} onClick={add} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 disabled:opacity-40">
              <ShoppingBag className="h-4 w-4" /> {p.stock === 0 ? tr(L, 'soldOut') : canAdd ? tr(L, 'add') : (hi ? 'सारा स्टॉक थैले में' : 'All stock in bag')}
            </button>
            <span className="text-sm text-muted-foreground">{p.stock} {tr(L, 'left')}</span>
          </div>
          {p.source !== 'upload' && p.sourceSecond != null && (
            <div className="overflow-hidden rounded-2xl border bg-card">
              <video ref={vid} data-testid="video-source" controls playsInline preload="metadata" src={`${SAMPLE_VIDEO}#t=${p.sourceSecond}`} className="aspect-video w-full bg-foreground"
                onLoadedMetadata={(e) => { e.currentTarget.currentTime = p.sourceSecond!; }}>
                <track default kind="captions" srcLang="hi" label="हिंदी" src={SAMPLE_CAPTIONS} />
              </video>
              <button data-testid="button-watch" onClick={() => { const v = vid.current; if (v) { v.currentTime = p.sourceSecond!; v.play().catch(() => {}); } }} className="w-full px-4 py-2.5 text-left text-sm font-semibold hover:bg-muted">
                {tr(L, 'watch')} · <span className="font-mono">{fmtClock(p.sourceSecond)}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
