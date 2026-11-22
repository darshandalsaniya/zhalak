import { useEffect, useState, useSyncExternalStore } from 'react';
import { seedProducts, type Product } from '@/lib/catalog-demo';

export type Lang = 'en' | 'hi';
export type OrderLine = { id: string; title: string; titleHi: string; image: string; qty: number; unitPrice: number };
export type Order = { id: string; createdAt: number; lines: OrderLine[]; total: number };
export type Stage = 'idle' | 'processing' | 'review';
export type DemoState = {
  stage: Stage;
  drafts: Product[];
  published: Product[];
  seeds: Product[];
  cart: { id: string; qty: number }[];
  orders: Order[];
  lang: Lang;
};

const KEY = 'cataloglens-demo-v1';

function fresh(): DemoState {
  return { stage: 'idle', drafts: [], published: [], seeds: seedProducts(Date.now()), cart: [], orders: [], lang: 'en' };
}

function load(): DemoState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fresh(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return fresh();
}

let state: DemoState = load();
if (state.stage === 'processing') state = { ...state, stage: 'idle' };
const listeners = new Set<() => void>();

export function setDemo(fn: (s: DemoState) => DemoState) {
  state = fn(state);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

export function resetDemo() { setDemo(() => fresh()); }

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) { state = load(); listeners.forEach((l) => l()); }
  });
}

export function useDemo(): DemoState {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
  );
}

export function catalogOf(s: DemoState): Product[] { return [...s.published, ...s.seeds]; }

export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

export function fmtClock(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

const dict = {
  shop: ['Shop', 'दुकान'], search: ['Search sarees, jhumkas, colours...', 'साड़ी, झुमके, रंग खोजें...'],
  all: ['All', 'सभी'], Sarees: ['Sarees', 'साड़ियाँ'], Jewellery: ['Jewellery', 'आभूषण'], Kurtas: ['Kurtas', 'कुर्ते'],
  add: ['Add to bag', 'थैले में डालें'], bag: ['Bag', 'थैला'], left: ['left', 'बचे'], soldOut: ['Sold out', 'स्टॉक खत्म'],
  dealEnds: ['Deal ends in', 'ऑफ़र खत्म होगा'], watch: ['Watch in showcase', 'वीडियो में देखें'],
  material: ['Material', 'कपड़ा / धातु'], color: ['Colour', 'रंग'], empty: ['Nothing matches that yet.', 'अभी कुछ नहीं मिला।'],
  fromVideo: ['From showcase', 'वीडियो से'], heroTitle: ['Meera Saree Ghar', 'मीरा साड़ी घर'],
  heroSub: ['Every piece from Meera ji\'s showcase, searchable in seconds.', 'मीरा जी के वीडियो की हर चीज़, कुछ ही पलों में खोजें।'],
  checkout: ['Place demo order', 'डेमो ऑर्डर करें'], total: ['Total', 'कुल'],
} as const;
export type DictKey = keyof typeof dict;
export function tr(lang: Lang, k: DictKey) { return dict[k][lang === 'en' ? 0 : 1]; }
