---
title: Predicate plan round-trip tests
status: active
priority: must
tags:
  - modeling
  - predicates
  - mcp
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-model-predicates-plan-roundtrip
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-08T08:33:07.281Z'
id: TEST-model-predicates-plan-roundtrip
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-a11956a40b119e204936b0c5
    test_id: TEST-model-predicates-plan-roundtrip
    scope: end_to_end
    outcome: passed
    code_snapshot: 958d97d1ca714d740f6d17315006a0e8f256102a370d9ee44f2b88223fb57c12
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-08T09:34:03.191Z'
    finished_at: '2026-10-08T09:34:06.924Z'
    artifact_digest: ae8795ffdfb7dfd20f648c8664cc5e8e5d4f3ca9a19e79eeee4e1dbaf0580ab8
    contract_hash: d3360762e3c0bfe0a82c7395c2205d59d28bcd94c8896c753322f0afb124261f
    binding_hash: ef8754f22e61532bef3dfe249bd78b8545552fc707a1b33e63fa897d2695cfe5
    fingerprint: c8f6ea434312c49ed9a623d1e7888a99da5226e383d88cabd365fa95e3d0dc21
    fingerprint_components:
      contract: d3360762e3c0bfe0a82c7395c2205d59d28bcd94c8896c753322f0afb124261f
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-model-predicates-plan-roundtrip
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Runs `packages/mcp/tests/predicate-plan-roundtrip.test.ts`, which starts the real kibi-mcp server over stdio in a fresh workspace, grounds two requirements through the strict lane, and applies the `record_ontology_gap` observation and the `replace_grounding` steps from `kb_model` mode `predicates` with `kb_upsert` and `kb_delete` exactly as returned, checking `kb_check` after every step; and `packages/cli/tests/operations/review-observation-plans.test.ts` and `packages/cli/tests/operations/suggest-predicates-existing-grounding.test.ts`, which check the plan shapes.