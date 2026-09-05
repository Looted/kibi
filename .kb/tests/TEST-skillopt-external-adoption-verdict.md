---
id: TEST-skillopt-external-adoption-verdict
title: SkillOpt rejects local-only evidence for production adoption
type: test
status: passing
created_at: 2026-07-30T00:00:00.000Z
updated_at: 2026-08-01T00:00:00.000Z
source: scripts/skillopt-eval/tests/real-workflow.test.ts
priority: must
tags:
  - skillopt
  - codex
  - evaluation
  - security
  - self-improvement
verification_scope: end_to_end
verification_perspective: internal
links:
  - type: validates
    target: SCEN-skillopt-external-adoption-verdict
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-skillopt-external-adoption-verdict
      target: default
  success_policy: all_required_first_attempt
---

The contract suite verifies that local or fake SkillOpt evidence remains review-only and cannot mutate canonical or mirror state. Production adoption stays blocked until an independently verified external verdict binds the source root, candidate hash, immutable root authorization, supervisor parent, invocation and matrix identity, and terminal evidence.

The bridge and workflow tests also verify rejection of incomplete staged-runtime configuration, forwarding of absolute Codex/bwrap flags, fail-fast scheduling after infrastructure failures, continued evaluation of behavioral failures, and structured exit-1 no-go output without an eligibility review for incomplete matrices.
