---
title: Consumer CLI compiles only-when prose to a forbid rule that decides scenarios by scope, validity window and approved exception
status: passing
priority: must
tags:
  - scenarios
  - scenario-feasibility
  - conditional
  - rules
  - validity
  - exceptions
  - compile-intent
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-conditional-feasibility-cli
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-kibi-conditional-feasibility-cli
    target: default
    native_id: packages/cli/tests/consumer/conditional-feasibility.test.ts::conditional requirement feasibility through the kibi CLI::an only-when requirement compiled from prose decides checkout scenarios
    source_file: packages/cli/tests/consumer/conditional-feasibility.test.ts
    line: 169
origin:
  kind: agent
  recorded_at: '2026-10-04T04:44:22.866Z'
id: TEST-kibi-conditional-feasibility-cli
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-90dfb12c8e413801d3bb1f2a
    test_id: TEST-kibi-conditional-feasibility-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: fe6e6e97a063e60a6bf8e87a96e9beab4bb6b1dca4557a6f6d3e31dbe3ab4133
    binding_hash: 61600799b99ad0c140a5a6041bfed9352ed30753d634c9463ea5aaee48ff0298
    fingerprint: 6d3d0b5082eaad74bbdaa1977e0c60cb1b277d85ee3890fd1efa9fd96a42bb5c
    fingerprint_components:
      contract: fe6e6e97a063e60a6bf8e87a96e9beab4bb6b1dca4557a6f6d3e31dbe3ab4133
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: fb0fefb021ec80de52e9d3c17fac77864701125ab8ae6741bb30e453411700bc
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-kibi-conditional-feasibility-cli
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
# Consumer CLI compiles only-when prose to a forbid rule that decides scenarios by scope, validity window and approved exception

Drives a fresh workspace through the built `kibi` binary (`packages/cli/tests/consumer/conditional-feasibility.test.ts`).

- `kibi compile-intent` turns "Checkout may happen only when the cart total is positive" into a `kibi.logic.v1` forbid rule, and `kibi apply-plan` applies the approved plan; nothing about the rule is hand-authored.
- Zero-total success scenarios are infeasible, a scenario outside the EU rule's scope is not applicable, and scenarios whose assumptions name a different property stay unknown; `kibi check` and the proof ladder in `kibi coverage` agree.
- A human-approved exception waives the compiled clause for its scenario only, and an exception naming a claim key that does not exist is rejected.
- With the rule bounded to 2027, a March 2027 scenario is infeasible, a June 2026 scenario is outside the window, and an undated one is reported as undetermined validity.
- A conditional whose condition cannot be translated compiles to no rule and no observation: the plan needs resolution and `kibi model-requirement` keeps the clause an ontology gap with an `unresolved_conditional_clause` warning.
