import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Search, PlayCircle } from 'lucide-react';
import { SAMPLE_POSTER } from '@/lib/catalog-demo';
import { useDemo, useNow, catalogOf, tr, type DictKey } from '@/lib/store';
import { Countdown, PriceTag } from '@/components/shell';

const CATS = ['all', 'Sarees', 'Jewellery', 'Kurtas', 'Other'] as const;

export default function Shop() {
  const s = useDemo();
  const now = useNow();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<(typeof CATS)[number]>('all');
  const all = catalogOf(s);
  const items = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all.filter((p) => (cat === 'all' || p.category === cat) &&
      (!t || [p.title, p.titleHi, p.description, p.descriptionHi, p.material, p.color, p.category].join(' ').toLowerCase().includes(t)));
  }, [all, q, cat]);
  const L = s.lang;
  const hi = L === 'hi';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-primary text-primary-foreground">
        <div className="bandhani absolute inset-0 opacity-40" />
        <div className="relative grid gap-6 p-6 md:grid-cols-[1.2fr_1fr] md:p-10">
          <div className="rise self-center">
            <p className="text-xs font-semibold uppercase tracking-[.2em] opacity-80">Jaipur · Johari Bazaar</p>
            <h1 className={`mt-2 text-4xl font-bold md:text-6xl ${hi ? '' : 'font-display'}`} style={hi ? { fontFamily: 'Tiro Devanagari Hindi' } : undefined}>{tr(L, 'heroTitle')}</h1>
            <p className="mt-3 max-w-md opacity-85">{tr(L, 'heroSub')}</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl border-4 border-accent/70">
            <img src={SAMPLE_POSTER} alt="Showcase" className="aspect-video w-full object-cover" />
            <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground"><PlayCircle className="h-4 w-4 text-primary" /> {hi ? 'आज का शोकेस' : "Today's showcase"}</span>
          </div>
        </div>
      </section>

      <div className="sticky top-[66px] z-30 -mx-4 mt-6 bg-background/90 px-4 py-3 backdrop-blur">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input data-testid="input-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr(L, 'search')}
            className="w-full rounded-full border border-input bg-card py-3 pl-11 pr-4 outline-none focus:ring-2 focus:ring-ring/40" />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {CATS.filter((c) => c !== 'Other' || all.some((p) => p.category === c)).map((c) => (
            <button key={c} data-testid={`button-cat-${c}`} onClick={() => setCat(c)}
              className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold transition ${cat === c ? 'border-secondary bg-secondary text-secondary-foreground' : 'bg-card hover:bg-muted'}`}>
              {tr(L, c as DictKey)}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div data-testid="empty-search" className="mt-10 grid place-items-center rounded-3xl border border-dashed p-12 text-center">
          <Search className="h-8 w-8 text-primary" /><p className="mt-3 font-semibold">{tr(L, 'empty')}</p>
          <button onClick={() => { setQ(''); setCat('all'); }} className="mt-3 rounded-full border px-4 py-1.5 text-sm">{hi ? 'खोज साफ़ करें' : 'Clear search'}</button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p, i) => {
            const fromVideo = s.published.some((x) => x.id === p.id);
            return (
              <Link key={p.id} href={`/shop/${p.id}`} data-testid={`card-product-${p.id}`} className="rise group block overflow-hidden rounded-3xl border bg-card transition hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="relative overflow-hidden">
                  <img src={p.image} alt={p.title} className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-105" />
                  {fromVideo && <span className="absolute left-2 top-2 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-secondary-foreground">{tr(L, 'fromVideo')}</span>}
                  {p.offerEndsAt && <span className="absolute bottom-2 left-2"><Countdown endsAt={p.offerEndsAt} now={now} lang={L} /></span>}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug">{hi ? p.titleHi : p.title}</p>
                  <div className="mt-1"><PriceTag p={p} now={now} /></div>
                  <p className="text-xs text-muted-foreground">{p.stock > 0 ? `${p.stock} ${tr(L, 'left')}` : tr(L, 'soldOut')}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
