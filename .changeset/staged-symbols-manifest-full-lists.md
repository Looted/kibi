---
"kibi-cli": patch
---

`kibi check --staged` now reports every symbol behind a `symbols_manifest_stale` or `kibi_impact_evidence_missing` diagnostic. Previously the missing and extra symbol lists were cut at six names before rendering, so the `… and N more` marker never appeared and the `--json` evidence silently dropped names. The Detail line now shows six names plus an accurate remaining count, the JSON evidence carries the complete lists, and "evidence covers N" counts only extracted symbols that have matching evidence instead of also counting stale evidence-only entries.

Technical summary: `diffSymbolEvidence` in `staged-symbols-manifest.ts` keeps the full sorted `missing`/`extra` arrays and sets `coveredCount` to `expectedCount - missing.length`; truncation happens only in `formatNameList` in `staged-diagnostics.ts`. The staged-diagnostics and staged-symbols-manifest `*.coverage.test.ts` files are folded into `staged-diagnostics.test.ts` and `staged-symbols-manifest.test.ts`.
