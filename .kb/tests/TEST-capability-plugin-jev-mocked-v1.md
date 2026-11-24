---
title: Jev mocked classifier and default-tree absence
status: passing
tags:
  - plugins
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-capability-plugin-jev-mocked-v1
      target: default
  success_policy: all_required_first_attempt
verification_perspective: internal
id: TEST-capability-plugin-jev-mocked-v1
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d4657a6eaefcc0039c808bbd
    test_id: TEST-capability-plugin-jev-mocked-v1
    scope: unit
    outcome: passed
    code_snapshot: abd26843632015172efc51d372c5c7cfaa6ff8ff4c960017406f5e79698cca8f
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-24T08:51:44.061Z'
    finished_at: '2026-11-24T08:51:44.119Z'
    artifact_digest: 04968db5681aed070f138a62568fcc3ffa8cbb8ba08cd1c08867abb7baa70a1d
    contract_hash: 94b719e8d7bd9c1d066a2901109d39016fbf3f80c627373c0b71cb9d4fe263a2
    binding_hash: 27dd4f33fb84d8eb642735d43477eeb46a3d61440fc9021d313903e7fd45a701
    fingerprint: b129d1f9cfee213d9a4ac391924d1cf5004708f46d751f8fa75038e95a7ddf30
    fingerprint_components:
      contract: 94b719e8d7bd9c1d066a2901109d39016fbf3f80c627373c0b71cb9d4fe263a2
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
      - symbol_id: SYM-unit-test-capability-plugin-jev-mocked-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
# TEST-capability-plugin-jev-mocked-v1

Automated coverage: packages/plugin-jev/tests/jev.test.ts and packages/cli/tests/plugins/default-deps-exclude-jev.test.ts
