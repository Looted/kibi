---
"kibi-agent-core": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-cli": patch
---

Projects set up with kibi-cli before 2.18.0 keep every symbol on one flow-sequence line of `.kb/symbols.yaml`, and the host hooks read none of it: the Claude Code hooks told agents that no symbol in a linked file was tied to a requirement, on every edit, when the opposite was true. The shared hook scanner now reads flow-layout manifests like block ones, the Claude Code edit hook no longer calls a file unowned when the manifest is unreadable or when the coordinate artifact binds a symbol to it that the scanner could not read (it says once per session that the manifest could not be read instead), and a plain `kibi sync` rewrites such a manifest in block layout once, keeping comments and order.

Technical summary: `kibi-agent-core` `knowledge-index` gains a flow-collection reader for `symbols: [ … ]` sections (single or multi-line, CRLF safe) and for flow values inside block records, the index reports `manifest` (`missing` | `empty` | `indexed` | `unreadable`), `coordinateFiles` and `unlinkedFiles`, and the cache format moves to v2 so stale indexes rebuild. `kibi-claude` adds `unreadableManifestNote` (once per session) in place of `unownedSourceNote` for an unreadable manifest or a coordinate-bound file with no indexed record; the Claude and Codex hook bundles are rebuilt. `kibi sync` calls `normalizeManifestLayout` on every tracked symbol manifest ahead of its no-op fast path, through the same `blockifySymbolManifest` helper `kb_upsert`'s manifest writer uses.
