---
id: TEST-coverage-depth-labels
title: Coverage depth label and diagnostic tests
status: passing
source: packages/core/tests/kb.plt
links:
  - type: validates
    target: SCEN-audit-quality-diagnostics-v1
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-coverage-depth-labels
      target: default
  success_policy: all_required_first_attempt
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-60ce55d0bbfc26b806c72506
    test_id: TEST-coverage-depth-labels
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: cc3b1fd6aa2bac840259da8e7170553d3c739c590c6bb6dbfcce61bb429c2bba
    binding_hash: dccb290511bdb25a47f7e8736dac44e5dec0ed84fa7bed5bdb7a9dddac0fcc35
    fingerprint: a0c75902ca545334509ea7f878651e1bedde35307ab6a851a899acfad912cdcb
    fingerprint_components:
      contract: cc3b1fd6aa2bac840259da8e7170553d3c739c590c6bb6dbfcce61bb429c2bba
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
      - symbol_id: SYM-unit-test-coverage-depth-labels
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---

Validates coverage-depth labels and weak coverage review diagnostics across core, CLI, and MCP coverage surfaces.
