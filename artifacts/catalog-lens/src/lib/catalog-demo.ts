export type Product = {
  id: string;
  title: string;
  titleHi: string;
  description: string;
  descriptionHi: string;
  category: 'Sarees' | 'Jewellery' | 'Kurtas';
  price: number;
  originalPrice: number;
  stock: number;
  material: string;
  color: string;
  image: string;
  sourceSecond: number | null;
  offerMinutes: number;
  offerEndsAt: number | null;
  needsReview: boolean;
};

export function sampleAsset(name: string): string {
  return `${import.meta.env.BASE_URL}demo/${name}`;
}

export const SAMPLE_VIDEO = sampleAsset('showcase.mp4');
export const SAMPLE_POSTER = sampleAsset('showcase-poster.jpg');
export const SAMPLE_CAPTIONS = sampleAsset('showcase-hi.vtt');

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatInr(value: number): string {
  return rupees.format(value);
}

export function effectivePrice(product: Product, now = Date.now()): number {
  return product.offerEndsAt !== null && now >= product.offerEndsAt
    ? product.originalPrice
    : product.price;
}

// The small, curated bilingual glossary is the only translation engine in this demo.
const glossary: Record<string, Pick<Product, 'id' | 'title' | 'titleHi' | 'description' | 'descriptionHi' | 'category' | 'material' | 'color'> & { photo: string }> = {
  'बनारसी सिल्क साड़ी': {
    id: 'showcase-banarasi',
    title: 'Rose Banarasi Silk Saree',
    titleHi: 'गुलाबी बनारसी सिल्क साड़ी',
    description: 'A rose-pink Banarasi silk saree finished with a rich, traditional gold zari border.',
    descriptionHi: 'गुलाबी बनारसी सिल्क साड़ी, पारंपरिक सुनहरी ज़री के बॉर्डर के साथ।',
    category: 'Sarees',
    material: 'Banarasi silk',
    color: 'Rose pink',
    photo: 'banarasi.webp',
  },
  'कुंदन नेकलेस सेट': {
    id: 'showcase-kundan',
    title: 'Ivory Kundan Necklace Set',
    titleHi: 'सफ़ेद कुंदन नेकलेस सेट',
    description: 'An ivory Kundan necklace with a gold-tone finish and matching earrings.',
    descriptionHi: 'सुनहरी रंगत वाला सफ़ेद कुंदन नेकलेस और उसके साथ मैचिंग झुमके।',
    category: 'Jewellery',
    material: 'Kundan stones, gold-tone alloy',
    color: 'Ivory',
    photo: 'kundan.webp',
  },
  'चिकनकारी कुर्ता': {
    id: 'showcase-chikankari',
    title: 'Sky Blue Chikankari Kurta',
    titleHi: 'आसमानी चिकनकारी कुर्ता',
    description: 'A breathable sky-blue cotton kurta with white Chikankari embroidery.',
    descriptionHi: 'सफ़ेद चिकनकारी कढ़ाई वाला हल्का आसमानी सूती कुर्ता।',
    category: 'Kurtas',
    material: 'Cotton',
    color: 'Sky blue',
    photo: 'chikankari.webp',
  },
};

export async function extractSampleProducts(): Promise<Product[]> {
  const response = await fetch(SAMPLE_CAPTIONS);
  if (!response.ok) throw new Error('Could not load the prepared sample captions.');
  const captions = (await response.text()).trim();
  if (!captions.startsWith('WEBVTT')) throw new Error('The sample captions are not available.');

  const products: Product[] = [];
  for (const cue of captions.split(/\r?\n[ \t]*\r?\n/).slice(1)) {
    const timing = cue.match(/^(\d{2}):(\d{2})\.(\d{3})\s+-->/);
    if (!timing) continue;
    const term = Object.keys(glossary).find((phrase) => cue.includes(phrase));
    if (!term) continue;
    const { photo, ...details } = glossary[term];
    const values = [...cue.matchAll(/₹([\d,]+)/g)].map((match) => Number(match[1].replaceAll(',', '')));
    const price = values.at(-1);
    if (price === undefined || price <= 0) throw new Error(`Check the sample captions for ${details.title}.`);
    const stockText = cue.match(/(\d+)\s*पीस/);
    const offerText = cue.match(/(\d+)\s*मिनट का ऑफ़र/);
    products.push({
      ...details,
      image: sampleAsset(photo),
      sourceSecond: Number(timing[1]) * 60 + Number(timing[2]) + Number(timing[3]) / 1000,
      price,
      originalPrice: values[0] ?? price,
      stock: stockText ? Number(stockText[1]) : 0,
      offerMinutes: offerText ? Number(offerText[1]) : 0,
      offerEndsAt: null,
      needsReview: stockText === null,
    });
  }
  if (products.length !== Object.keys(glossary).length) {
    throw new Error('Not all three products were found in the sample captions. Please try again.');
  }
  return products;
}

export function seedProducts(now = Date.now()): Product[] {
  return [
    {
      id: 'seed-marigold',
      title: 'Marigold Cotton Silk Saree',
      titleHi: 'गेंदा रंग की कॉटन सिल्क साड़ी',
      description: 'An easy-to-drape cotton silk saree with a fine gold border and a warm marigold finish.',
      descriptionHi: 'सुनहरे बॉर्डर वाली हल्की गेंदा रंग की कॉटन सिल्क साड़ी।',
      category: 'Sarees',
      price: 1499,
      originalPrice: 1899,
      stock: 6,
      material: 'Cotton silk',
      color: 'Marigold',
      image: sampleAsset('marigold.webp'),
      sourceSecond: null,
      offerMinutes: 120,
      offerEndsAt: now + 120 * 60_000,
      needsReview: false,
    },
    {
      id: 'seed-jhumkas',
      title: 'Silver Pearl Jhumkas',
      titleHi: 'मोती वाले सिल्वर झुमके',
      description: 'Oxidised silver-tone jhumkas with tiny pearl accents, easy to pair with everyday looks.',
      descriptionHi: 'रोज़ पहनने के लिए छोटे मोतियों वाले ऑक्सीडाइज़्ड सिल्वर रंग के झुमके।',
      category: 'Jewellery',
      price: 549,
      originalPrice: 549,
      stock: 10,
      material: 'Silver-tone alloy',
      color: 'Silver',
      image: sampleAsset('jhumkas.webp'),
      sourceSecond: null,
      offerMinutes: 0,
      offerEndsAt: null,
      needsReview: false,
    },
    {
      id: 'seed-kurta',
      title: 'Coral Block Print Kurta',
      titleHi: 'कोरल ब्लॉक प्रिंट कुर्ता',
      description: 'A straight-cut cotton kurta with delicate cream block prints on a soft coral base.',
      descriptionHi: 'हल्के कोरल रंग पर क्रीम ब्लॉक प्रिंट वाला सीधे कट का सूती कुर्ता।',
      category: 'Kurtas',
      price: 799,
      originalPrice: 799,
      stock: 7,
      material: 'Cotton',
      color: 'Coral',
      image: sampleAsset('coral.webp'),
      sourceSecond: null,
      offerMinutes: 0,
      offerEndsAt: null,
      needsReview: false,
    },
  ];
}
