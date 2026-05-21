---
"kibi-cli": patch
"kibi-opencode": patch
---

**Behavior-changing source edits now require Kibi impact evidence before commit.**

The `kibi check --staged` command now enforces a hard gate: behavior-changing source edits must be accompanied by staged Kibi impact evidence (KB entity documentation or refreshed `documentation/symbols.yaml`). This prevents commits that change behavior without updating the knowledge base.

**New diagnostics:**
- `kibi_impact_evidence_missing` — emitted when behavior source edits lack staged KB evidence
- `symbols_manifest_stale` — emitted when source edits alter symbol coordinates but the staged manifest is missing or stale

**What this means for users:**
- If you change behavior-bearing source code, stage relevant KB entity markdown or refresh `documentation/symbols.yaml`
- Test-only edits (`tests/`, `*.test.*`) and docs-only edits (`.md`) are exempt
- The no-impact override is available only for classifier false positives, not genuine behavior changes

**OpenCode guidance updated** to remind agents that Kibi impact evidence is required before completion/commit.

**Technical changes:**
- Added `packages/cli/src/traceability/evidence-model.ts` — typed Kibi impact evidence interfaces
- Added `packages/cli/src/traceability/staged-diagnostics.ts` — `collectStagedKibiDiagnostics()` with stable diagnostic IDs
- Added `packages/cli/src/traceability/staged-impact-contract.ts` — behavior classification and evidence parsing
- Added `packages/cli/src/traceability/staged-symbols-manifest.ts` — stale manifest detection
- Extended `packages/cli/src/commands/check.ts` staged path to evaluate impact evidence
- Updated pre-commit hook comments and contributor docs