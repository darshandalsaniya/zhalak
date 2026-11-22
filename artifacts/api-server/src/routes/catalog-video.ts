import { raw, Router, type IRouter } from "express";
import { AnalyzeCatalogVideoBody } from "@workspace/api-zod";
import { analyzeSellerAudio, readWavDuration, SarvamCatalogError } from "../lib/sarvam-catalog";

const router: IRouter = Router();
const windowMs = 10 * 60_000;
let attempts: number[] = [];
let active = 0;

router.post("/catalog/video-analysis", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  // This pilot has no seller sign-in. Do not expose the paid endpoint on a public deployment.
  if (process.env.NODE_ENV === "production" || !process.env.SARVAM_API_KEY) {
    res.status(503).json({ error: "Video transcription is available in the private demo preview once Sarvam is configured." });
    return;
  }
  if (req.get("sec-fetch-site") === "cross-site") {
    res.status(403).json({ error: "Upload from CatalogLens Seller Studio." });
    return;
  }
  if (!req.is("multipart/form-data")) {
    res.status(415).json({ error: "No audio file was attached." });
    return;
  }
  const now = Date.now();
  attempts = attempts.filter((time) => now - time < windowMs);
  if (attempts.length >= 8 || active >= 2) {
    res.set("Retry-After", String(attempts.length >= 8 ? Math.ceil((attempts[0] + windowMs - now) / 1000) : 30));
    res.status(429).json({ error: "The demo has reached its upload limit. Please wait a little before trying again." });
    return;
  }
  active += 1;
  res.once("close", () => { active -= 1; });
  next();
}, raw({ type: "multipart/form-data", limit: "1000kb", inflate: false }), async (req, res): Promise<void> => {
  let audio: Blob;
  let duration: number;
  try {
    if (!Buffer.isBuffer(req.body)) throw new Error("Missing body.");
    const form = await new Request("http://localhost/catalog-audio", {
      method: "POST",
      headers: { "Content-Type": req.get("Content-Type") ?? "" },
      body: Uint8Array.from(req.body),
    }).formData();
    const parsed = AnalyzeCatalogVideoBody.parse({ audio: form.get("audio") });
    audio = parsed.audio;
    const seconds = readWavDuration(Buffer.from(await audio.arrayBuffer()));
    if (seconds === null || seconds > 30) throw new Error("Unsupported WAV.");
    duration = seconds;
  } catch {
    res.status(400).json({ error: "The app needs a readable audio track of 30 seconds or less." });
    return;
  }

  attempts.push(Date.now());
  try {
    const result = await analyzeSellerAudio(process.env.SARVAM_API_KEY!, audio, duration);
    res.json(result);
  } catch (err) {
    const step = err instanceof SarvamCatalogError ? err.step : "unknown";
    const providerStatus = err instanceof SarvamCatalogError ? err.providerStatus : null;
    req.log.warn({ step, providerStatus }, "Catalog video analysis failed");
    const message = providerStatus === 401 || providerStatus === 403
      ? "Sarvam did not authorize this request. Check the project's Sarvam key, credit balance, and API access."
      : providerStatus === 429
        ? "Sarvam is limiting requests or the account has run out of credits. Try again later."
        : step === "transcribe"
          ? "Sarvam couldn't transcribe this clip. Check that speech is audible and try again."
          : "Sarvam couldn't turn the transcript into draft products. Please try again.";
    res.status(502).json({ error: message });
  }
});

export default router;
