---
"kibi-cli": patch
"kibi-core": patch
---

`kibi check` and `kibi status` are faster on a warm engine. On Kibi's own KB a repeated check went from 32 s to 16 s and status from 3.7 s to 1.1 s, with identical output.

- The symbol-granularity check keeps each source file's parsed analysis in the branch store (`source-analysis-cache.json`, untracked), keyed by the file's path and content and by the active source analyzers, so unchanged files are not parsed again.
- A requirement's proof stages that do not depend on the check time (semantic inventory, logic grounding, contradictions, scenarios, scenario tests, implementing symbols) are kept per KB generation, so a new check reuses them and only re-judges receipts.
- Status keeps its source-to-entity index per KB generation, which every freshness probe of every command reads.
- The workspace proof snapshot reads files directly instead of one awaited read per file, relationship shards are parsed once per process, and the symbol coordinate overlay reads and hashes each source file once.
