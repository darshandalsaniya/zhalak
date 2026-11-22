const samplesPerSecond = 16_000;
const bytesPerSecond = 2 * samplesPerSecond;
const headerBytes = 44;
// Sarvam's synchronous speech-to-text endpoint accepts at most 30 seconds per file.
const maxSegmentSamples = 30 * samplesPerSecond;

export const maxCatalogSeconds = 120;
export const maxCatalogUploadBytes = headerBytes + maxCatalogSeconds * bytesPerSecond + 16_384;

export function readWavDuration(wav: Buffer): number | null {
  // Accept only the canonical mono 16 kHz PCM WAV written by the browser.
  if (wav.length <= headerBytes || wav.toString("ascii", 0, 4) !== "RIFF" ||
      wav.readUInt32LE(4) !== wav.length - 8 ||
      wav.toString("ascii", 8, 16) !== "WAVEfmt " ||
      wav.readUInt32LE(16) !== 16 || wav.readUInt16LE(20) !== 1 ||
      wav.readUInt16LE(22) !== 1 || wav.readUInt32LE(24) !== samplesPerSecond ||
      wav.readUInt32LE(28) !== bytesPerSecond || wav.readUInt16LE(32) !== 2 ||
      wav.readUInt16LE(34) !== 16 || wav.toString("ascii", 36, 40) !== "data" ||
      wav.readUInt32LE(40) !== wav.length - headerBytes || wav.length % 2 !== 0) return null;
  return (wav.length - headerBytes) / bytesPerSecond;
}

function sampleAt(wav: Buffer, index: number): number {
  return wav.readInt16LE(headerBytes + index * 2);
}

// Balance segment lengths, preferring a quiet point near each cut when the cap allows it.
function quietCut(wav: Buffer, target: number, lower: number, upper: number): number {
  const step = 640; // 40 ms
  const first = Math.max(lower, target - samplesPerSecond);
  const last = Math.min(upper, target + samplesPerSecond);
  let best = target;
  let minEnergy = Infinity;
  for (let cut = first; cut <= last; cut += step) {
    let energy = 0;
    for (let i = cut - step / 2; i < cut + step / 2; i += 16) energy += Math.abs(sampleAt(wav, i));
    if (energy < minEnergy || (energy === minEnergy && Math.abs(cut - target) < Math.abs(best - target))) {
      best = cut;
      minEnergy = energy;
    }
  }
  return best;
}

export function splitSpeechWav(wav: Buffer): { audio: Blob; offset: number; seconds: number }[] {
  const total = (wav.length - headerBytes) / 2;
  const segments = Math.ceil(total / maxSegmentSamples);
  const result: { audio: Blob; offset: number; seconds: number }[] = [];
  let from = 0;
  for (let remaining = segments; remaining > 0; remaining -= 1) {
    const to = remaining === 1 ? total : quietCut(
      wav, from + Math.ceil((total - from) / remaining),
      total - (remaining - 1) * maxSegmentSamples, from + maxSegmentSamples,
    );
    let firstAudible = from;
    while (firstAudible < to && Math.abs(sampleAt(wav, firstAudible)) < 164) firstAudible += 1;
    if (firstAudible < to) {
      // Sarvam can timestamp the first phrase at zero even after a long silent lead-in.
      // Remove that lead-in with 250 ms of padding and use the actual new start as the offset.
      const start = Math.max(from, firstAudible - samplesPerSecond / 4);
      const pcm = wav.subarray(headerBytes + start * 2, headerBytes + to * 2);
      const payload = new Uint8Array(headerBytes + pcm.length);
      payload.set(wav.subarray(0, headerBytes));
      payload.set(pcm, headerBytes);
      const view = new DataView(payload.buffer);
      view.setUint32(4, payload.byteLength - 8, true);
      view.setUint32(40, pcm.length, true);
      result.push({
        audio: new Blob([payload], { type: "audio/wav" }),
        offset: start / samplesPerSecond,
        seconds: (to - start) / samplesPerSecond,
      });
    }
    from = to;
  }
  return result;
}
