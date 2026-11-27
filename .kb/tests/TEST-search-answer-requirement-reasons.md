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
    receipt_id: PR-08b2e2e9933db208650d1ea6
    test_id: TEST-search-answer-requirement-reasons
    scope: end_to_end
    outcome: passed
    code_snapshot: 4f27e9b2b2c7cf29e22be49a1789910470c7432fa60042ba1eb9cb152985fa6a
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-24T19:33:41.155Z'
    finished_at: '2026-11-24T19:34:06.016Z'
    artifact_digest: 5e765389f7e47c48a518bd0d6c527ea668968a60fb60f01e9ff05597c36afde9
    contract_hash: 52dfb01c7e4dc38f26ff1b9e54d30afdc01c27a2bc244bf4c618063e49fbc02d
    binding_hash: c3fa597ed7281edb42bd6718169e37a22cf128013d85c3ee61c96b94677b0065
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
Runs kibi search through the built CLI on a workspace with a requirement that has a rationale field, one with a Why section and one with neither, and checks each governing entry's why and the answer note (packages/cli/tests/consumer/search-answer-layer.test.ts). Unit tests in packages/cli/tests/search-answer.test.ts cover each source in order, a Reason not stated section, one that names who asked and the source before saying Reason not stated (also past the excerpt limit), a rationale field that says Reason not stated, the 280-character limit and the byte-budget shrink order.

A false pass would be a fixture whose requirements all record a reason the same way, so the order between sources and the recorded false mark are never exercised.
