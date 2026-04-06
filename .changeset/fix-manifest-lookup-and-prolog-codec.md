---
"kibi-cli": patch
---

fix(cli): merge working-tree manifests with staged overrides in buildManifestLookup

- `kibi check --staged` now pre-populates `manifestLookup` from the working-tree
  `config.paths.symbols` manifest before processing staged-manifest overrides.
  This prevents code-only staged changes (where `symbols.yaml` is not staged) from
  falling back to hash-generated IDs and incorrectly failing traceability even when
  the symbol is already linked in the KB.
- Remove duplicate `toPrologString` in `temp-kb.ts` and reuse the shared
  `toPrologString` from `../prolog/codec` to keep Prolog serialisation consistent.
