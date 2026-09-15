---
"kibi-cli": patch
---

`kibi check --staged` now tells you what to fix, not just that you failed. The `symbols_manifest_stale` and `kibi_impact_evidence_missing` errors carry `Detail:` lines that name, per staged file, how many symbols the extractor finds, how many the staged evidence covers, and exactly which symbols are missing from `.kb/symbols.yaml` — with their definition lines. When uncovered symbols are the cause, the `Suggestion:` now leads with authoring the missing manifest entries (`kibi upsert`, with `implements`/`covered_by` links) before the coordinates refresh; when the evidence has merely drifted, it keeps the refresh-coordinates guidance. The same detail is available to tooling in the `evidence` field of the JSON output's `qualityDiagnostics`.

Technical summary: `assessStagedSymbolsManifest` returns per-file `fileDetails` (expected/covered counts, missing titles with lines, extra titles, capped at six names with an `… and N more` marker); the diff threads through `KibiImpactSymbolsManifest` into `collectStagedKibiDiagnostics`, which renders `Detail:` lines and selects the cause-appropriate suggestion; the `symbols_manifest_stale` resolution contract and `docs/cli-reference.md` staged-impact-evidence section were updated to match.
