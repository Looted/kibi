---
"kibi-cli": patch
---

Staging a `symbol_role` addition or edit in `.kb/symbols.yaml` now counts as authored Kibi impact evidence during `kibi check --staged`. Previously, commits that updated a symbol's `symbol_role` (such as classifying a record as `behavioral` or `config`) without changing other manifest fields were treated as having no authored symbol changes and could fail the staged impact gate.

- Include `symbolRole` (`record.symbol_role` when string, else `null`) in `NormalizedAuthoredManifestSymbol` and `normalizeAuthoredManifestSymbolsForSourceFile()` in `packages/cli/src/traceability/staged-symbols-manifest.ts`.
- Preserve `ignoreMigrationOwnedEdits` behavior so migration-only edits with unchanged `symbol_role` stay classified as migration-only while commits that also edit `symbol_role` remain reported as authored changes.
- Add behavioral tests covering `symbol_role` additions, edits, removals, unchanged values, migration-only separation, and staged impact gate evaluation.
