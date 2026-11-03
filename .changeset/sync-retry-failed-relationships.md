---
"kibi-cli": patch
---

`kibi sync` now retries a relationship that failed because its target could not be compiled. Before, fixing only the target (for example a fact that failed validation) left the link missing: sync reported "no changes", and `kibi check` kept reporting `source-relationship-parity` until `kibi sync --rebuild`.

`persistRelationships` returns the source files whose front-matter relationships could not be asserted, and sync leaves them out of the sync cache, so the next sync extracts them again and re-asserts their links.
