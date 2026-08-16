---
"kibi-cli": patch
---

Kibi discovery commands no longer let one relationship query corrupt JSON output for later commands sharing the workspace engine. Status now distinguishes a readable branch store from an unavailable or malformed engine response, so operators get a safe restart hint instead of an unnecessary branch-store recovery diagnosis.

- Keep daemon Prolog answer formatting immutable across requests, reject `set_prolog_flag` through the engine query boundary, and fail closed when exclusive publication cannot stop an existing engine.
- Add bounded JSON-binding diagnostics and regression coverage for cross-command engine reuse and status classification.
