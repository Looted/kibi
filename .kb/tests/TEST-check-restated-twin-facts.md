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
    receipt_id: PR-e5c4a52cb998b0ba5322cef2
    test_id: TEST-check-restated-twin-facts
    scope: end_to_end
    outcome: passed
    code_snapshot: 68d525dd498f336569fa26225633a2739e6d22f929ce226b6b56c22a76486158
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T10:53:10.950Z'
    finished_at: '2026-11-16T10:53:13.709Z'
    artifact_digest: 6f9a5f040c54ff166022de920a2e3a7c5fcde3785248fb6135c032e927f12b4f
    contract_hash: 55081024705703e1860c1c08ce9f86ad925a4e83b67d5362de3a258f68fbcc37
    binding_hash: d44580d6aa3691f69aaf02bbd8a3f190d03cd69bddeea9537a2dcc7dc707ff19
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