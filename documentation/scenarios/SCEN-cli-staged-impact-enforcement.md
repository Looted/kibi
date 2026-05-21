---
id: SCEN-cli-staged-impact-enforcement
title: CLI staged check blocks behavior edits without Kibi impact evidence
status: active
---

# CLI Staged Impact Enforcement

## Given
- A repository with kibi initialized
- Source files are staged for commit

## When
- `kibi check --staged` runs (via hook or manually)
- Behavior-changing source edits are staged without Kibi impact evidence

## Then
- The check exits non-zero with `kibi_impact_evidence_missing`
- The diagnostic lists the behavior source edit paths
- Resolution instructions guide the user to stage KB entity docs or refresh the symbols manifest

## Exemptions
- Test-only edits (`tests/`, `*.test.*`, `*.spec.*`) do not trigger the diagnostic
- Docs-only edits (`.md` files) do not trigger the diagnostic
- Comment-only or formatting-only diffs are classified as non-behavioral

## Stale Manifest Detection
- When source edits alter extracted symbol coordinates but `documentation/symbols.yaml` is not staged or is stale, `symbols_manifest_stale` is emitted
- Timestamp-only churn in the manifest does not hard-fail

## Override Policy
- `no_impact_override` is available only for classifier false positives
- It must include a rationale and is auditable
- It NEVER satisfies genuinely behavior-changing edits
