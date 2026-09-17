---
"kibi-runtime": patch
"kibi-codex": patch
"kibi-cursor": patch
---

No user-facing behavior change: `kibi-runtime` now resolves its bundled-skills directory lazily on first use instead of at import time, `isWithinRoot` drops a redundant same-path comparison, `kibi-cursor` drops a provably dead `planDelivered` early return and an always-true stdin branch, and the hook runners' stdin buffering is simplified to an unconditional `Buffer.from`. The reshaping lets the new mutation-testing suite (`docs/mutation-testing.md`, run via `bun run test:mutation`) prove these paths exhaustively — the suite holds a 100% mutation score over `kibi-runtime`, `kibi-codex`, and `kibi-cursor` sources.
