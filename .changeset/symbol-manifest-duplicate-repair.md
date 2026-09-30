---
"kibi-cli": patch
---

Upserting a symbol now repairs a duplicated symbol record. A rebase that keeps
both sides of `.kb/symbols.yaml` can leave the same symbol ID in the manifest
twice, each copy with different requirement and test links. Only one copy
reached the knowledge base, and `kb_upsert` updated the first copy while the
second kept shadowing it, so the duplicate could never be fixed through Kibi.

- The symbol manifest writer folds every record with the upserted ID into the
  first one: it keeps the union of their relationships and fills fields the
  first copy lacks, then removes the other copies.
- Deleting a symbol removes every copy, not just the first.
- Repaired the three duplicated records already on `develop`
  (`SYM-ReceiptCodeScopeEntry`, `SYM-resolveBoundSymbolScope`,
  `SYM-COVERAGE_SHARDS`), which now carry the combined links of both copies.
