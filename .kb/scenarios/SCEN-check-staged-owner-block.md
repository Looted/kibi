---
title: One unowned function gives one blocking block
status: active
expects: success
tags:
  - check
  - staged
origin:
  kind: agent
  recorded_at: '2026-11-16T16:50:00.000Z'
id: SCEN-check-staged-owner-block
type: scenario
---
Given a repository whose src/greet.ts already implements a requirement covered by a test, when a commit stages a new function in that file with no symbol record, then kibi check --staged fails with one [BLOCKS COMMIT] block for the function that names the requirement, a kb_upsert input whose implementedBy entry names the function and the covering test, the CLI form and git add .kb && git commit, and prints none of symbols_manifest_stale, kibi_impact_evidence_missing, symbol_semantic_review_needed or Traceability failed; --format json lists the block under ownerFindings with those ids as causes and keeps the underlying findings.

packages/cli/tests/commands/check-staged-enforcement.test.ts runs it through the CLI; packages/cli/tests/traceability/owner-findings.test.ts covers the merge rules.