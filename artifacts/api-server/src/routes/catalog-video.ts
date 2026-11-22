import { raw, Router, type IRouter } from "express";
import { AnalyzeCatalogVideoBody } from "@workspace/api-zod";
import { analyzeSellerAudio, SarvamCatalogError } from "../lib/sarvam-catalog";
import { maxCatalogSeconds, maxCatalogUploadBytes, readWavDuration } from "../lib/catalog-wav";

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
    res.status(403).json({ error: "Upload from Zhalak Seller Studio." });
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
}, raw({ type: "multipart/form-data", limit: maxCatalogUploadBytes, inflate: false }), async (req, res): Promise<void> => {
  let wav: Buffer;
  try {
    if (!Buffer.isBuffer(req.body)) throw new Error("Missing body.");
    const form = await new Request("http://localhost/catalog-audio", {
      method: "POST",
      headers: { "Content-Type": req.get("Content-Type") ?? "" },
      body: Uint8Array.from(req.body),
    }).formData();
    const parsed = AnalyzeCatalogVideoBody.parse({ audio: form.get("audio") });
    wav = Buffer.from(await parsed.audio.arrayBuffer());
    const seconds = readWavDuration(wav);
    if (seconds === null || seconds > maxCatalogSeconds) throw new Error("Unsupported WAV.");
  } catch {
    res.status(400).json({ error: "The app needs a readable audio track of 2 minutes or less." });
    return;
  }

  if (res.destroyed) return;
  const cancel = new AbortController();
  res.once("close", () => { if (!res.writableEnded) cancel.abort(); });
  attempts.push(Date.now());
  try {
    const result = await analyzeSellerAudio(process.env.SARVAM_API_KEY!, wav, cancel.signal);
    res.json(result);
  } catch (err) {
    if (cancel.signal.aborted) return;
    const step = err instanceof SarvamCatalogError ? err.step : "unknown";
    const providerStatus = err instanceof SarvamCatalogError ? err.providerStatus : null;
    req.log.warn({ step, providerStatus }, "Catalog video analysis failed");
    const message = providerStatus === 401 || providerStatus === 403
      ? "Sarvam did not authorize this request. Check the project's Sarvam key, credit balance, and API access."
      : providerStatus === 429
        ? "Sarvam is limiting requests or the account has run out of credits. Try again later."
        : step === "transcribe"
          ? "Sarvam couldn't transcribe this clip. Check that speech is audible and try again."
          : step === "draft" && providerStatus === 200
            ? "The audio was transcribed, but Sarvam did not return a usable product list after two attempts."
            : "The audio was transcribed, but Sarvam could not create draft products. Try again later.";
    res.status(502).json({ error: message });
  }
});

export default router;
