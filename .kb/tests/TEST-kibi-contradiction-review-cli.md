---
title: 'Consumer CLI: an Escape claim next to a prose-only cancel requirement compiles to unresolved with that requirement to review, a reported conflict blocks, and bootstrap names it'
status: passing
priority: must
tags:
  - contradictions
  - compile-intent
  - bootstrap
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-contradiction-review-cli
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-kibi-contradiction-review-cli
    target: default
    native_id: packages/cli/tests/consumer/contradiction-review.test.ts::contradiction analysis reports what it could not check::an unmodeled claim next to a prose-only requirement is unresolved with that requirement to review
    source_file: packages/cli/tests/consumer/contradiction-review.test.ts
    line: 117
origin:
  kind: agent
  recorded_at: '2026-10-15T16:04:57.148Z'
id: TEST-kibi-contradiction-review-cli
type: test
---
Drives a fresh workspace through the built `kibi` binary (`packages/cli/tests/consumer/contradiction-review.test.ts`). A drawing editor has a closed, prose-only requirement saying Escape cancels a label edit without saving. Compiling "Escape saves the label" must give `unresolved` with `unmodeled_target` and that requirement in `reviewCandidates`; a `conflict` review blocks the plan; a `no_conflict` review keeps the outcome unresolved while the claim is unmodeled. A modeled claim next to a prose-only requirement stays `ready` but `unresolved` until reviewed, a modeled consistent pair is `no_conflict`, and `kb_plan_bootstrap` names the prose-only requirement for a planned claim.
