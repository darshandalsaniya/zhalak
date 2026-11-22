---
name: GitHub source control
description: How to finish attaching the GitHub integration after authorization.
---

Resolve the GitHub source-control integration again after the user authorizes it. Attach the current handle if the status says it is authorized but not yet attached.

**Why:** The unconnected integration handle can differ from the authorized one. Attaching the pre-authorization handle can fail even though the user completed the flow.

**How to apply:** Treat account authorization, attaching the integration, and choosing a Git remote as separate steps. No code is pushed just by connecting GitHub.
