---
"kibi-cli": patch
"kibi-runtime": patch
---

A fresh clone with a restored `.kb/` no longer reports every source file stale when its symbols were written by `kb_upsert` into an untracked `.kb/symbols.yaml` that an older Kibi left without a pending-source receipt. `kb_status` now confirms those files against the per-symbol source hashes recorded in `.kb/symbol-coordinates.yaml`, and the next `kibi sync` (including the automatic `freshness-resync` action) compiles that manifest so the store records its content hash for every later clone.

Technical summary: `confirmSourceNewerReasons` reads the canonical `.kb/symbol-coordinates.yaml` (plus the artifact beside every hashed manifest) even when the manifest's composite hash is absent from `sync-cache.json`; a file with neither cache nor coordinate evidence keeps its reason. Before discovery, `syncCommand` calls the new `adoptUpsertOnlySymbolManifest`: when `.kb/symbols.yaml` is untracked by Git, has no pending-source receipt, declares symbols, and at least one of them is already in the compiled branch store (one entity lookup per id through the engine, stopping at the first hit), it writes the receipt `kb_upsert` writes, so tracked-only discovery includes the manifest. A hand-written untracked manifest whose symbols the store never saw keeps the tracked-only boundary and sync's "stage this file" note.
