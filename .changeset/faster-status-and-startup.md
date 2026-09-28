---
"kibi-cli": patch
"kibi-core": patch
"kibi-plugin-builtin": patch
---

`kibi status` and every CLI command start faster on large knowledge bases. On
this repository, `kibi status` for a fresh KB drops from about 3 seconds to
about 1.7, and a command that needs neither schema validation nor symbol
extraction starts about 0.5 seconds sooner.

- `kb_status_json` skips the full-entity stale-reason scan when the KB is
  fresh, because a fresh verdict already rules out every stale reason.
- `kibi-plugin-builtin` loads ts-morph (the TypeScript compiler) on first
  symbol analysis instead of at import time.
- The CLI compiles its entity and relationship JSON schemas on first use.
