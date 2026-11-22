import { analyzeCatalogVideo, ApiError } from '@workspace/api-client-react';
import { sampleAsset, type Product } from './catalog-demo';

const supportedTypes = new Set(['video/mp4', 'video/quicktime', 'video/webm']);
const maxVideoSeconds = 120;
// Container metadata and decoder padding may differ by a fraction of a frame.
const durationTolerance = 0.05;
export const uploadLimits = `MP4, MOV or WebM · ${maxVideoSeconds / 60} minutes max · 50 MB max`;

export function validateVideoFile(file: File): string | null {
  if (!file.size || file.size > 50_000_000) return 'Choose a non-empty video under 50 MB.';
  if (!supportedTypes.has(file.type) && !(!file.type && /\.(mp4|mov|webm)$/i.test(file.name))) {
    return 'Choose an MP4, MOV or WebM video.';
  }
  return null;
}

function waitForVideo(video: HTMLVideoElement, event: 'loadeddata' | 'seeked'): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener('error', fail);
      video.removeEventListener(event, done);
    };
    const done = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error('This browser could not play the clip. Try exporting it as an MP4 with AAC audio.')); };
    const timer = window.setTimeout(fail, 8_000);
    video.addEventListener(event, done, { once: true });
    video.addEventListener('error', fail, { once: true });
  });
}

function wavFile(audio: AudioBuffer): File {
  const channelData = Array.from({ length: audio.numberOfChannels }, (_, i) => audio.getChannelData(i));
  const samples = Math.min(audio.length, maxVideoSeconds * audio.sampleRate);
  const bytes = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(bytes);
  const put = (pos: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(pos + i, text.charCodeAt(i));
  };
  put(0, 'RIFF');
  view.setUint32(4, bytes.byteLength - 8, true);
  put(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16_000, true);
  view.setUint32(28, 32_000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  put(36, 'data');
  view.setUint32(40, samples * 2, true);
  let peak = 0;
  for (let i = 0; i < samples; i += 1) {
    const sample = channelData.reduce((sum, channel) => sum + channel[i], 0) / channelData.length;
    const pcm = Math.max(-1, Math.min(1, sample));
    peak = Math.max(peak, Math.abs(pcm));
    view.setInt16(44 + i * 2, pcm * (pcm < 0 ? 32768 : 32767), true);
  }
  if (peak < 0.005) throw new Error('The clip is silent. Choose a video with audible product descriptions.');
  return new File([bytes], 'showcase.wav', { type: 'audio/wav' });
}

async function captureFrame(video: HTMLVideoElement, second: number): Promise<string> {
  const target = Math.min(Math.max(0, second), Math.max(0, video.duration - 0.08));
  if (Math.abs(video.currentTime - target) > 0.01) {
    const sought = waitForVideo(video, 'seeked');
    video.currentTime = target;
    await sought;
  }
  return captureCurrentFrame(video);
}

export function captureCurrentFrame(video: HTMLVideoElement): string {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
    throw new Error('Play the video, pause on your product, then try grabbing the still again.');
  }
  const scale = Math.min(1, 480 / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not capture a frame.');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.65);
}

export async function draftsFromVideo(
  file: File, signal: AbortSignal, onSending: () => void,
): Promise<{ drafts: Product[]; transcript: string }> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  try {
    const loaded = waitForVideo(video, 'loadeddata');
    video.src = url;
    await loaded;
    if (!Number.isFinite(video.duration) || video.duration <= 0 || video.duration > maxVideoSeconds + durationTolerance) {
      throw new Error('Trim the video to 2 minutes or less and try again.');
    }
    signal.throwIfAborted();
    let audio: AudioBuffer;
    try {
      const decoder = new OfflineAudioContext(1, 1, 16_000);
      audio = await decoder.decodeAudioData(await file.arrayBuffer());
    } catch {
      throw new Error('Could not read the audio track. Try an MP4 with AAC audio and clear speech.');
    }
    if (audio.duration > maxVideoSeconds + durationTolerance) {
      throw new Error('Trim the audio and video to 2 minutes or less and try again.');
    }
    signal.throwIfAborted();
    const outgoing = wavFile(audio);
    onSending();
    const result = await analyzeCatalogVideo({ audio: outgoing }, { signal });
    const drafts: Product[] = [];
    for (const p of result.products) {
      signal.throwIfAborted();
      // Use an audio timestamp as a starting point, not a claim of visual detection.
      const image = p.sourceSecond === null ? sampleAsset('no-frame.svg')
        : await captureFrame(video, p.sourceSecond + 0.4).catch(() => sampleAsset('no-frame.svg'));
      drafts.push({
        ...p,
        id: `upload-${crypto.randomUUID()}`,
        image,
        price: p.price ?? 0,
        originalPrice: p.price ?? 0,
        stock: p.stock ?? 0,
        stockMissing: p.stock === null,
        offerMinutes: 0,
        offerEndsAt: null,
        needsReview: true,
        source: 'upload',
        sourceName: file.name,
      });
    }
    return { drafts, transcript: result.transcript };
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}

export function uploadErrorMessage(error: unknown): string {
  if (error instanceof ApiError && typeof error.data === 'object' && error.data &&
      'error' in error.data && typeof error.data.error === 'string') return error.data.error;
  if (error instanceof ApiError || error instanceof TypeError) return 'Could not reach the analysis service. Try again in the private demo preview.';
  return error instanceof Error ? error.message : 'Could not analyze the video. Try a different clip.';
}
