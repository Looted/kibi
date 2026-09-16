---
"kibi-runtime": patch
---

No user-facing behavior change: the bundled-skills directory used by `kibi-runtime` is now resolved lazily on first use instead of at import time, and `isWithinRoot` drops a redundant same-path comparison with identical results. The reshaping lets the new mutation-testing suite (`docs/mutation-testing.md`, run via `bun run test:mutation`) prove these paths exhaustively — the suite now holds a 100% mutation score over `kibi-runtime`, `kibi-codex`, and `kibi-cursor` sources.
