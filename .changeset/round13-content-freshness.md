---
"kibi-cli": minor
"kibi-runtime": patch
---

`kb_status` no longer reports a freshly cloned or checked-out workspace as stale just because every file got a new modification time. A source is only reported as newer than the compiled store when its content differs from what the last `kibi sync` compiled, and sources that really changed now come with one automatic `freshness-resync` action (`kibi sync`) that `kb_apply_plan` can run, instead of one review-only action per file with no executor.

Technical summary: `executeStatus` confirms each `indexed_source_newer`, `knowledge_source_newer` and `documentation_source_newer` reason against recorded content hashes (the store's `sync-cache.json` source hashes, a symbol manifest's composite hash of its referenced sources, or the coordinate artifact's per-symbol `sourceHash`), drops reasons whose sha256 matches and recomputes `syncState`/`dirty` when nothing else remains. `buildActionsFromStatus` maps the remaining reasons to a single automatic `freshness-resync` action (code `freshness_resync`, `kibi sync`), and `applyMigrationAction` runs it through `syncCommand`. The Prolog status module is unchanged.
