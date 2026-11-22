import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { Play, Sparkles, Check, AlertTriangle, Clock, Send, PackageCheck, FileText, ArrowRight, Upload, LoaderCircle } from 'lucide-react';
import { extractSampleProducts, SAMPLE_VIDEO, SAMPLE_POSTER, SAMPLE_CAPTIONS, formatInr, type Product } from '@/lib/catalog-demo';
import { useDemo, setDemo, fmtClock } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { captureCurrentFrame, draftsFromVideo, uploadErrorMessage, uploadLimits, validateVideoFile } from '@/lib/video-upload';

const STEPS = ['Reading prepared Hindi captions for the sample', 'Finding where each product is shown', 'Drafting titles, prices and stock', 'Flagging anything that needs your eye'];

export default function Studio() {
  const s = useDemo();
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeUpload = useRef<AbortController | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ file: File; url: string } | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const { toast } = useToast();
  const previewUrl = selected?.url;
  const uploadDrafts = s.stage === 'review' && s.drafts.some((product) => product.source === 'upload');
  const playingUpload = !!previewUrl && (s.stage === 'idle' || uploadDrafts);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => () => activeUpload.current?.abort(), []);

  const selectUpload = (file: File) => {
    const issue = validateVideoFile(file);
    setError(issue);
    if (!issue) {
      setSelected({ file, url: URL.createObjectURL(file) });
      setTranscript('');
    }
  };

  const analyzeUpload = async () => {
    if (!selected || activeUpload.current || s.stage !== 'idle') return;
    const run = new AbortController();
    activeUpload.current = run;
    setError(null);
    setTranscript('');
    setUploadStatus('Preparing the audio from your clip…');
    try {
      const result = await draftsFromVideo(selected.file, run.signal, () => setUploadStatus('Sarvam is transcribing the audio and drafting products…'));
      if (run.signal.aborted) return;
      setTranscript(result.transcript);
      if (result.drafts.length === 0) {
        setError('No products were found in the speech. Try a clip that clearly names the items for sale.');
        return;
      }
      setDemo((x) => x.stage === 'idle' ? { ...x, stage: 'review', drafts: result.drafts } : x);
    } catch (err) {
      if (!run.signal.aborted) setError(uploadErrorMessage(err));
    } finally {
      if (activeUpload.current === run) activeUpload.current = null;
      if (!run.signal.aborted) setUploadStatus(null);
    }
  };

  const start = async () => {
    setSelected(null);
    setTranscript('');
    setError(null);
    setDemo((x) => ({ ...x, stage: 'processing' }));
    setStep(0);
    const timer = setInterval(() => setStep((n) => Math.min(n + 1, STEPS.length - 1)), 700);
    try {
      const [drafts] = await Promise.all([extractSampleProducts(), new Promise((r) => setTimeout(r, 3000))]);
      setDemo((x) => ({ ...x, stage: 'review', drafts: drafts as Product[] }));
    } catch {
      setError('Could not read the sample captions. Please try again.');
      setDemo((x) => ({ ...x, stage: 'idle' }));
    } finally { clearInterval(timer); }
  };

  const seek = (sec: number) => {
    const v = videoRef.current; if (!v) return;
    v.currentTime = sec; v.play().catch(() => {});
    v.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const update = (id: string, patch: Partial<Product>) =>
    setDemo((x) => ({ ...x, drafts: x.drafts.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));

  const flagged = s.drafts.filter((d) => d.needsReview).length;
  const missingRequired = s.drafts.some((d) => !d.title.trim() || !d.titleHi.trim() || d.price <= 0 || d.stockMissing);
  const publish = () => {
    if (flagged || missingRequired || !s.drafts.length) return;
    const now = Date.now();
    const ready = s.drafts.map((d) => ({ ...d, originalPrice: Math.max(d.price, d.originalPrice), needsReview: false, offerEndsAt: d.offerMinutes > 0 && d.price < d.originalPrice ? now + d.offerMinutes * 60000 : null }));
    setDemo((x) => ({ ...x, published: [...ready, ...x.published.filter((p) => !ready.some((r) => r.id === p.id))], drafts: [], stage: 'idle' }));
    setSelected(null);
    setTranscript('');
    toast({ title: `${ready.length} products are live`, description: 'Open the buyer shop in this browser to see them.' });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="rise">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">Seller studio · Meera Saree Ghar, Jaipur</p>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Your Hindi showcase,<br /><em className="text-primary">turned into a shop.</em>
          </h1>
          <p className="mt-4 max-w-md text-lg text-foreground/75">Buyers should not have to watch 20 minutes to find one blue Banarasi. Try the flow on our sample showcase, no setup needed.</p>
          {s.stage === 'idle' && (
            <>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <button type="button" disabled={!!uploadStatus} data-testid="button-upload-video" onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:-translate-y-0.5 disabled:opacity-50">
                  <Upload className="h-4 w-4" /> Upload video
                </button>
                <button type="button" disabled={!!uploadStatus} data-testid="button-start-sample" onClick={start}
                  className="inline-flex items-center gap-2 rounded-full border bg-card px-5 py-3 font-bold hover:bg-muted disabled:opacity-50">
                  <Sparkles className="h-4 w-4 text-primary" /> Build drafts from the sample video
                </button>
                <input type="file" hidden ref={inputRef} accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) selectUpload(file);
                  event.currentTarget.value = '';
                }} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{uploadLimits}. Choose a clip where you say the name, price and stock for each item.</p>
              {selected && (
                <div className="mt-4 max-w-lg rounded-2xl border bg-card p-4">
                  <p className="truncate text-sm font-semibold" title={selected.file.name}>{selected.file.name}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Only the audio is sent to Sarvam for transcription and draft generation. The video stays on your device. Only upload clips you have permission to use.</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button type="button" disabled={!!uploadStatus} onClick={analyzeUpload} data-testid="button-analyze-video"
                      className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground disabled:opacity-60">
                      {uploadStatus ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Analyze video
                    </button>
                    <button type="button" disabled={!!uploadStatus} onClick={() => { setSelected(null); setTranscript(''); setError(null); }} className="text-sm font-semibold underline disabled:opacity-50">Remove video</button>
                  </div>
                </div>
              )}
              {uploadStatus && <p role="status" className="mt-3 text-sm font-semibold text-secondary">{uploadStatus}</p>}
            </>
          )}
          {error && <p role="alert" data-testid="text-error" className="mt-3 text-sm text-destructive">{error}</p>}
          <p className="mt-4 max-w-md text-xs text-muted-foreground">The sample uses prepared captions. Your own clips use speech only; text or prices visible on screen aren't read.</p>
        </div>
        <div className="rise overflow-hidden rounded-[1.6rem] border-4 border-card bg-card shadow-2xl shadow-primary/15" style={{ animationDelay: '.15s' }}>
          <video key={playingUpload ? previewUrl : SAMPLE_VIDEO} ref={videoRef} data-testid={playingUpload ? 'video-upload' : 'video-sample'} controls playsInline preload="metadata" poster={playingUpload ? undefined : SAMPLE_POSTER} src={playingUpload ? previewUrl : SAMPLE_VIDEO} className="aspect-video w-full bg-foreground">
            {!playingUpload && <track default kind="captions" srcLang="hi" label="हिंदी" src={SAMPLE_CAPTIONS} />}
          </video>
          <div className="flex items-center gap-2 px-4 py-3 text-sm"><Play className="h-4 w-4 shrink-0 text-primary" /> <span className="truncate">{playingUpload ? selected?.file.name : 'Sample showcase · Hindi · about 24s · 3 pieces'}</span></div>
        </div>
      </section>

      {s.stage === 'processing' && (
        <section data-testid="panel-processing" className="mt-12 rounded-3xl border bg-card p-6 md:p-8">
          <h2 className="font-display text-2xl font-bold">Reading the sample showcase</h2>
          <p className="mt-1 text-sm text-muted-foreground">Drafts come from the sample's prepared captions. Nothing is uploaded and no AI model is called.</p>
          <div className="relative mt-5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="scan absolute inset-y-0 w-1/3 rounded-full bg-primary" /></div>
          <ol className="mt-6 space-y-3">
            {STEPS.map((t, i) => (
              <li key={t} className={`flex items-center gap-3 text-sm transition ${i <= step ? 'opacity-100' : 'opacity-35'}`}>
                <span className={`grid h-6 w-6 place-items-center rounded-full ${i < step ? 'bg-secondary text-secondary-foreground' : 'border'}`}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>{t}
              </li>
            ))}
          </ol>
        </section>
      )}

      {s.stage === 'review' && (
        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold">Review {s.drafts.length} drafts</h2>
              <p className="text-sm text-muted-foreground">{uploadDrafts ? 'Drafted from speech. Check each product, fill missing prices or stock, and approve before publishing.' : "Built from the sample's prepared captions. Tap a timestamp to jump the video there."}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="text-sm font-semibold underline" onClick={() => {
                if (confirm('Discard these unpublished drafts?')) {
                  setDemo((x) => ({ ...x, drafts: [], stage: 'idle' }));
                  setTranscript('');
                }
              }}>Discard drafts</button>
              <button data-testid="button-publish" disabled={flagged > 0 || missingRequired || s.drafts.length === 0} onClick={publish}
                className="inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-3 font-bold text-secondary-foreground transition disabled:opacity-40">
                <Send className="h-4 w-4" /> {flagged > 0 ? `Review ${flagged} flagged first` : missingRequired ? 'Complete required fields' : 'Publish to my shop'}
              </button>
            </div>
          </div>
          <div className="mt-6 space-y-5">
            {s.drafts.map((d, i) => <DraftCard key={d.id} d={d} i={i} onSeek={d.source !== 'upload' || playingUpload ? seek : undefined} onChange={(p) => update(d.id, p)} onCapture={d.source === 'upload' && playingUpload ? () => {
              const video = videoRef.current;
              if (!video) return;
              try {
                video.pause();
                update(d.id, { image: captureCurrentFrame(video), sourceSecond: video.currentTime, needsReview: true });
                toast({ title: 'Product still updated' });
              } catch (err) {
                toast({ title: 'Could not grab this still', description: uploadErrorMessage(err), variant: 'destructive' });
              }
            } : undefined} onRemove={s.drafts.length > 1 ? () => {
              if (confirm('Remove this draft product?')) setDemo((x) => ({ ...x, drafts: x.drafts.filter((p) => p.id !== d.id) }));
            } : undefined} />)}
          </div>
        </section>
      )}
      {transcript && <details className="mt-5 rounded-2xl border bg-card p-4">
        <summary className="cursor-pointer text-sm font-bold">View Sarvam transcript</summary>
        <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{transcript}</p>
      </details>}

      {s.stage === 'idle' && s.published.length > 0 && (
        <section className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-secondary p-6 text-secondary-foreground">
          <div><p className="font-display text-2xl font-bold">{s.published.length} products live from your showcase</p><p className="text-sm opacity-80">Visible in the buyer shop in this browser.</p></div>
          <Link href="/shop" data-testid="link-view-shop" className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 font-bold text-accent-foreground">View buyer shop <ArrowRight className="h-4 w-4" /></Link>
        </section>
      )}

      <section className="mt-12">
        <h2 className="font-display text-3xl font-bold">Orders</h2>
        <p className="text-sm text-muted-foreground">Demo orders placed from the buyer shop in this browser. No money moves.</p>
        {s.orders.length === 0 ? (
          <div data-testid="empty-orders" className="mt-5 grid place-items-center rounded-3xl border border-dashed p-10 text-center">
            <PackageCheck className="h-8 w-8 text-primary" />
            <p className="mt-3 font-semibold">No orders yet</p>
            <p className="text-sm text-muted-foreground">Place a demo order from the buyer shop and it lands here.</p>
          </div>
        ) : (
          <div className="mt-5 divide-y rounded-3xl border bg-card">
            {s.orders.map((o) => (
              <div key={o.id} data-testid={`row-order-${o.id}`} className="flex flex-wrap items-center gap-4 p-4">
                <span className="rounded-full bg-accent px-3 py-1 font-mono text-xs font-bold">{o.id}</span>
                <span className="text-sm">{o.lines.map((l) => `${l.qty} x ${l.title}`).join(', ')}</span>
                <span className="ml-auto font-mono">{formatInr(o.total)}</span>
                <span className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>{children}</label>;
}
const inp = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40';

function DraftCard({ d, i, onSeek, onChange, onRemove, onCapture }: { d: Product; i: number; onSeek?: (s: number) => void; onChange: (p: Partial<Product>) => void; onRemove?: () => void; onCapture?: () => void }) {
  const num = (v: string) => Math.max(0, Number(v) || 0);
  const uploaded = d.source === 'upload';
  const patch = (values: Partial<Product>) => onChange(uploaded ? { ...values, needsReview: true } : values);
  const complete = !d.stockMissing && d.price > 0 && !!d.title.trim() && !!d.titleHi.trim();
  return (
    <article data-testid={`card-draft-${d.id}`} className={`rise grid gap-5 rounded-3xl border bg-card p-5 md:grid-cols-[180px_1fr] ${d.needsReview ? 'ring-2 ring-accent' : ''}`} style={{ animationDelay: `${i * 0.08}s` }}>
      <div>
        <img src={d.image} alt={d.title} className="aspect-[4/5] w-full rounded-2xl object-cover" />
        {d.sourceSecond != null && onSeek && (
          <button data-testid={`button-seek-${d.id}`} onClick={() => onSeek(d.sourceSecond!)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold hover:bg-muted">
            <Clock className="h-4 w-4 text-primary" /> {uploaded ? 'Video moment' : 'Seen at'} <span className="font-mono">{fmtClock(d.sourceSecond)}</span>
          </button>
        )}
        {onCapture && <button type="button" data-testid={`button-capture-${d.id}`} onClick={onCapture} className="mt-2 w-full rounded-full border px-3 py-2 text-sm font-semibold hover:bg-muted">Use current video frame</button>}
        {uploaded && !onSeek && <p className="mt-2 text-xs text-muted-foreground">Video preview is only available during the upload session.</p>}
      </div>
      <div className="space-y-4">
        {d.needsReview && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-accent/30 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <span className="flex-1">{uploaded ? (complete ? 'Check the suggested details against your video.' : 'Fill in the titles, a price above zero, and the stock count before approving.') : 'Stock was unclear in the captions. Check the count, then confirm.'}</span>
            <button disabled={uploaded && !complete} data-testid={`button-confirm-${d.id}`} onClick={() => onChange({ needsReview: false })} className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">{uploaded ? 'Approve product' : 'Confirm stock'}</button>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title (English)"><input data-testid={`input-title-${d.id}`} className={inp} value={d.title} onChange={(e) => patch({ title: e.target.value })} /></Field>
          <Field label="शीर्षक (हिंदी)"><input data-testid={`input-titlehi-${d.id}`} className={inp} value={d.titleHi} onChange={(e) => patch({ titleHi: e.target.value })} /></Field>
          <Field label="Description (English)"><textarea data-testid={`input-desc-${d.id}`} rows={2} className={inp} value={d.description} onChange={(e) => patch({ description: e.target.value })} /></Field>
          <Field label="विवरण (हिंदी)"><textarea data-testid={`input-deschi-${d.id}`} rows={2} className={inp} value={d.descriptionHi} onChange={(e) => patch({ descriptionHi: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Field label="Category">
            <select data-testid={`select-category-${d.id}`} className={inp} value={d.category} onChange={(e) => patch({ category: e.target.value as Product['category'] })}>
              <option>Sarees</option><option>Jewellery</option><option>Kurtas</option><option>Other</option>
            </select>
          </Field>
          <Field label="Price (₹)"><input data-testid={`input-price-${d.id}`} type="number" min="1" className={`${inp} font-mono`} value={uploaded && !d.price ? '' : d.price} placeholder="Not stated" onChange={(e) => patch({ price: Math.floor(num(e.target.value)) })} /></Field>
          <Field label="Original price"><input data-testid={`input-original-${d.id}`} type="number" min="0" className={`${inp} font-mono`} value={uploaded && !d.originalPrice ? '' : d.originalPrice} onChange={(e) => patch({ originalPrice: Math.floor(num(e.target.value)) })} /></Field>
          <Field label="Stock"><input data-testid={`input-stock-${d.id}`} type="number" min="0" className={`${inp} font-mono ${d.needsReview ? 'border-accent' : ''}`} value={d.stockMissing ? '' : d.stock} placeholder="Not stated" onChange={(e) => patch({ stock: Math.floor(num(e.target.value)), stockMissing: uploaded && e.target.value === '' })} /></Field>
          <Field label="Deal minutes"><input data-testid={`input-offer-${d.id}`} type="number" min="0" className={`${inp} font-mono`} value={d.offerMinutes} onChange={(e) => patch({ offerMinutes: Math.floor(num(e.target.value)) })} /></Field>
        </div>
        {uploaded ? <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Material"><input className={inp} value={d.material} onChange={(e) => patch({ material: e.target.value })} /></Field>
          <Field label="Colour"><input className={inp} value={d.color} onChange={(e) => patch({ color: e.target.value })} /></Field>
        </div> : <p className="flex items-center gap-2 text-xs text-muted-foreground"><FileText className="h-3.5 w-3.5" /> {d.material} · {d.color}</p>}
        {uploaded && onRemove && <button type="button" className="text-xs font-semibold text-destructive underline" onClick={onRemove}>Remove draft</button>}
      </div>
    </article>
  );
}
