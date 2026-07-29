---
id: TEST-skillopt-codex-optimization
title: Codex SkillOpt contract rejects stale hosts and gates
type: test
status: passing
created_at: 2026-07-21T00:00:00Z
updated_at: 2026-07-29T00:00:00Z
source: scripts/skillopt-eval/tests/methodology-contract.test.ts
priority: must
tags: [skillopt, codex, evaluation, integration, security]
verification_scope: integration
verification_perspective: internal
links:
  - type: validates
    target: SCEN-skillopt-codex-optimization
---

The parsed methodology and run-lock contracts require the same Codex-only host, held-out, family, bootstrap, and bundle gate values. The run-lock schema rejects stale evaluation-host arrays before a run can start.

The offline Codex cell-runner suite verifies canonical four-skill assembly with body-only candidate replacement, immutable frontmatter and resources, required diagnostic-mode Kibi MCP startup, sealed network and `.kb` permissions, deterministic variant blinding, sanitized tolerant JSONL replay, terminal evidence receipts, and bounded cleanup. Adversarial cases cover candidate surface edits, direct `.kb` access, missing MCP evidence, forbidden writes, malformed or empty JSONL, timeout, and hidden-data leakage without paid model calls. Process-tree harnesses prove that Python-owned Bun, Codex, and grandchild processes are reaped after timeout and interruption; cleanup fault injection proves private auth/workspaces remain retryable until removal succeeds.

The bridge CLI suite verifies that non-fake requests construct a Codex cell from bridge inputs and delegate it through the real default dependency factory rather than returning synthetic scores.

The current contract tests also cover CLI parsing and dispatch, schema compatibility for unknown fields, official trainer request and result lineage, fresh development and blinded held-out evaluation, and the guard that no adoption happens before eligibility.
