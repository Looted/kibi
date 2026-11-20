---
title: Predicate modeling existing grounding tests
status: passing
priority: must
tags:
  - modeling
  - predicates
  - grounding
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-model-predicates-grounding-aware
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-07T12:28:53.070Z'
id: TEST-model-predicates-grounding-aware
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ee7ea47735e92eb4c4886630
    test_id: TEST-model-predicates-grounding-aware
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 953805cbcb8f30e109990bf04b454614f4c98de76b1d842ddd8062cdb24cd74d
    binding_hash: 0f0f9b504b614cdaa6be0c1f1b8ffb6a8c4b58096dfc51b0d720466b2d33f52d
    fingerprint: 737f0a27ee4fa63047709bec3db870ddd761f4e9dd27e1d369c4593248648a7f
    fingerprint_components:
      contract: 953805cbcb8f30e109990bf04b454614f4c98de76b1d842ddd8062cdb24cd74d
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
      - symbol_id: SYM-test-model-predicates-grounding-aware
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs predicate suggestion against a KB port that answers the requirement's requires_property link and the grounding fact's claim key, and checks the already_grounded result, the ordered replacement plan with one grounding link per claim, and the relationship target for both grounded and ungrounded claims (packages/cli/tests/operations/suggest-predicates-existing-grounding.test.ts).

A false pass would be a grounding fact with a different claim key; the second test uses one and expects the normal predicate plan.