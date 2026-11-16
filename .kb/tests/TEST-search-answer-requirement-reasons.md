---
title: Search answer recorded-reason tests
status: passing
priority: must
tags:
  - search
  - answer
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-16T10:21:03.489Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-search-answer-layer
      target: default
  success_policy: all_required_first_attempt
id: TEST-search-answer-requirement-reasons
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3d7b2d94bcde12414a40da10
    test_id: TEST-search-answer-requirement-reasons
    scope: end_to_end
    outcome: passed
    code_snapshot: 0e10f770e2a4d095cddf6fffb8b025d7cc932797b7938f6234133653063f3590
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T10:23:05.853Z'
    finished_at: '2026-11-16T10:23:18.538Z'
    artifact_digest: 5c15bfaaab743e3f87eea5f0aa3375b86ab4cbba0355c21aca7c3fc6045a9d96
    contract_hash: 52dfb01c7e4dc38f26ff1b9e54d30afdc01c27a2bc244bf4c618063e49fbc02d
    binding_hash: 5c6ca49028ee890c95cca8b7ef11742212603b4ba5718009c2c5aa7cf4cf74df
    fingerprint: 91f91298196d96e55a13d2c41a78833837832da7e4e53823ca35c05bcae96586
    fingerprint_components:
      contract: 52dfb01c7e4dc38f26ff1b9e54d30afdc01c27a2bc244bf4c618063e49fbc02d
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
      - symbol_id: SYM-test-kibi-search-answer-layer
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs kibi search through the built CLI on a workspace with a requirement that has a rationale field, one with a Why section and one with neither, and checks each governing entry's why and the answer note (packages/cli/tests/consumer/search-answer-layer.test.ts). Unit tests in packages/cli/tests/search-answer.test.ts cover each source in order, a Reason not stated section, the 280-character limit and the byte-budget shrink order.

A false pass would be a fixture whose requirements all record a reason the same way, so the order between sources and the recorded false mark are never exercised.