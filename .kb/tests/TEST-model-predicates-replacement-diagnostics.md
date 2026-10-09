---
title: Predicate replacement plan diagnostics tests
status: active
tags:
  - modeling
  - predicates
  - replacement-plan
priority: must
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: onboarding evaluation round 9 finding K20'
  recorded_at: '2026-10-09T07:21:50.285Z'
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-model-predicates-replacement-diagnostics
      target: default
  success_policy: all_required_first_attempt
id: TEST-model-predicates-replacement-diagnostics
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e3346f68e2d4c4570ce4b528
    test_id: TEST-model-predicates-replacement-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: ef462154276e18a22fc27d7e05cb5710d76da971a9db3fecf51033784cb2c51b
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-09T07:26:10.438Z'
    finished_at: '2026-10-09T07:26:15.271Z'
    artifact_digest: 5e7be268235fe601e693304b5c0700867b89be26d1f8b51e2dd8b49e71c71e2e
    contract_hash: 128d08307beffcc155cd8f640d079ad4c66cae0527d4f6f8a24dd288eb674b72
    binding_hash: a76d3044649783952eef49c9830aa1b9d4e32dcee7361e2dc37c4036fb0b5cbc
    fingerprint: 6e38a2aadb1c379700b321e39599705a8a3974b3530b1a359c11e8f6ee6e9c57
    fingerprint_components:
      contract: 128d08307beffcc155cd8f640d079ad4c66cae0527d4f6f8a24dd288eb674b72
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
      - symbol_id: SYM-test-model-predicates-replacement-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Runs the MCP predicate plan round-trip suite, which applies a grounding replacement plan step by step against a live KB and asserts that the findings kb_check reports after each step equal the plan's expected.kbCheckAfterStep (nothing, then both logic-coverage and strict-req-fact-pairing, then nothing), and the suggest-predicates existing-grounding suite, which checks the expected field, the rollback condition and the prose instructions of the replacement plan.