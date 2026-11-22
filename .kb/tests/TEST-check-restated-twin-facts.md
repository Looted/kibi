---
title: Restated twin fact check tests
status: passing
priority: must
tags:
  - check
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-16T10:52:44.697Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-check-restated-twin-facts
      target: default
  success_policy: all_required_first_attempt
id: TEST-check-restated-twin-facts
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3fd9b2a3d25750a9bb5c3e64
    test_id: TEST-check-restated-twin-facts
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 55081024705703e1860c1c08ce9f86ad925a4e83b67d5362de3a258f68fbcc37
    binding_hash: 44125354821033b05767a2dd5f0ed24845e086d1516c6c42bd5ed75414b9f43e
    fingerprint: c54456daa71515fba626adc3a38218ddfa6d6c69145ca170e16ea4c5b568ef2b
    fingerprint_components:
      contract: 55081024705703e1860c1c08ce9f86ad925a4e83b67d5362de3a258f68fbcc37
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
      - symbol_id: SYM-test-check-restated-twin-facts
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs kibi check through the built CLI on a workspace where two requirements ground twin facts: the twins are reported until the second requirement restates the first (packages/cli/tests/consumer/restated-twin-facts.test.ts). The plunit suite (packages/core/tests/semantic_quality.plt) covers supersedes and a group with an unrelated third fact.

A false pass would be twins that differ in operator or value, which the rule never groups, so the exemption is never exercised.