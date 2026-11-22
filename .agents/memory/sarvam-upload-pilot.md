---
name: Sarvam upload pilot
description: Privacy, publishing, and timestamp constraints for seller video analysis.
---

Use Sarvam's direct APIs for the CatalogLens upload pilot, not an MCP connection. Extract the audio in the browser and keep the video on the device. The seller can choose a still if Sarvam does not provide a usable timestamp for a product.

**Why:** Replit's managed custom MCP needs HTTPS and Sarvam's hosted docs endpoint only exposes documentation search. The pilot does not need to send full video to transcribe speech. Sarvam returns phrase-level timestamps, so a spoken clip can produce more products than there are useful timestamp anchors.

**How to apply:** Leave unverified details and unavailable timestamps unset rather than inventing them. Keep the paid endpoint off in public builds until seller access and per-seller spending controls are added; the current prototype has no seller accounts.

The seller should be able to upload a clip up to two minutes long. Sarvam's synchronous speech endpoint caps each audio request at 30 seconds; split the audio for transcription, restore full-video timestamps, and use the combined transcript for a single product review. Sarvam can timestamp a phrase at the start of a segment even if speech comes much later; trim long silent lead-ins before sending and add that offset back.

Sarvam's chat JSON mode can return valid JSON and HTTP 200 without the requested product array. A successful transcription is not evidence that drafting succeeded. Diagnose response shape without logging the transcript or raw model output.
