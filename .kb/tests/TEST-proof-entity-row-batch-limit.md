---
title: An entity row batch shall hold at most 200 rows, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-entity-row-batch-limit
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-entity-row-batch-limit
  proves:
    - CLAIM-F6665DD0020E5123
origin:
  kind: agent
  recorded_at: '2026-10-28T21:34:07.113Z'
id: TEST-proof-entity-row-batch-limit
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-447ee09972ddb1bba87aaf8f
    test_id: TEST-proof-entity-row-batch-limit
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: f7b5aac306a46cb03fcc6070994a7b6038fd6f6cb95d739f62a4e20092340394
    binding_hash: 76b15faa43b38049be2879e604bbcbd36075ed9175f621cf5cf0a71e378af063
    fingerprint: 52298e18b9b27e2c86dac7e39183fc82884cb094214a84337603c642642b537a
    fingerprint_components:
      contract: f7b5aac306a46cb03fcc6070994a7b6038fd6f6cb95d739f62a4e20092340394
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
      - symbol_id: SYM-proof-entity-row-batch-limit
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-entity-row-batch-limit
      variable: row_batch_limit
      value_type: int
      assumptions:
        - operator: eq
          value: 200
      claim:
        operator: eq
        value: 200
    certificate_digest: df834592eeecd69bc2d9abdf244e3ec897ea4a9a804281da7a495cf155fc7c33
    claim_bindings:
      - claim_key: CLAIM-F6665DD0020E5123
        requirement_id: REQ-kibi-operation-row-limits
        fact_id: FACT-entity-row-batch-limit
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 200
          value_type: int
          variable: row_batch_limit
---
Proves that an entity row batch shall hold at most 200 rows, against the code Kibi reads at ingest.