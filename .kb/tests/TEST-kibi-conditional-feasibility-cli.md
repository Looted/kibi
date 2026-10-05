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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-03efc775a84b161532bd6a05
    test_id: TEST-kibi-conditional-feasibility-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: fe6e6e97a063e60a6bf8e87a96e9beab4bb6b1dca4557a6f6d3e31dbe3ab4133
    binding_hash: 80cd070fefbc1d4c1b1a257c0073fe35d8e45fa36ceebbd764eb7bc512012a1e
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
---
# Consumer CLI compiles only-when prose to a forbid rule that decides scenarios by scope, validity window and approved exception

Drives a fresh workspace through the built `kibi` binary (`packages/cli/tests/consumer/conditional-feasibility.test.ts`).

- `kibi compile-intent` turns "Checkout may happen only when the cart total is positive" into a `kibi.logic.v1` forbid rule, and `kibi apply-plan` applies the approved plan; nothing about the rule is hand-authored.
- Zero-total success scenarios are infeasible, a scenario outside the EU rule's scope is not applicable, and scenarios whose assumptions name a different property stay unknown; `kibi check` and the proof ladder in `kibi coverage` agree.
- A human-approved exception waives the compiled clause for its scenario only, and an exception naming a claim key that does not exist is rejected.
- With the rule bounded to 2027, a March 2027 scenario is infeasible, a June 2026 scenario is outside the window, and an undated one is reported as undetermined validity.
- A conditional whose condition cannot be translated compiles to no rule and no observation: the plan needs resolution and `kibi model-requirement` keeps the clause an ontology gap with an `unresolved_conditional_clause` warning.
