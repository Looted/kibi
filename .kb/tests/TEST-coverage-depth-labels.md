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
    receipt_id: PR-71dcd977e8b790332549546f
    test_id: TEST-coverage-depth-labels
    scope: unit
    outcome: passed
    code_snapshot: c78d87453534f34be23060678a90114386641b97f24f1f909f008a3c1ad06ae5
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-25T12:28:16.616Z'
    finished_at: '2026-10-25T12:28:18.235Z'
    artifact_digest: 2e458d9368f95d3a69736d077245fcbe3eedc5c86d74c3ade8f46d8426133b94
    contract_hash: cc3b1fd6aa2bac840259da8e7170553d3c739c590c6bb6dbfcce61bb429c2bba
    binding_hash: 3b972ee8e6061e51915df226eb5d322f6f6214fdbdc984d37a8cbe881a8818f6
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
