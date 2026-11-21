---
title: Predicate replacement plan diagnostics tests
status: passing
tags:
  - modeling
  - predicates
  - replacement-plan
priority: must
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-09: onboarding evaluation round 9 finding K20'
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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-18aeb8e48566d9b886efe92b
    test_id: TEST-model-predicates-replacement-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 128d08307beffcc155cd8f640d079ad4c66cae0527d4f6f8a24dd288eb674b72
    binding_hash: fe0a786d9450f4871261ad71ee2201319be279e31046256711f8f36b8d8cda63
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
    kind: e2e
    evidence_level: tested
---
Runs the MCP predicate plan round-trip suite, which applies a grounding replacement plan step by step against a live KB and asserts that the findings kb_check reports after each step equal the plan's expected.kbCheckAfterStep (nothing, then both logic-coverage and strict-req-fact-pairing, then nothing), and the suggest-predicates existing-grounding suite, which checks the expected field, the rollback condition and the prose instructions of the replacement plan.