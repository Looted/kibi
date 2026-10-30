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
    receipt_id: PR-6f5a8c9a8b07fa306c64dde8
    test_id: TEST-proof-entity-row-batch-limit
    scope: unit
    outcome: passed
    code_snapshot: 4a410a4b172d96ffc22e237f1f614e03788860485453af7945975e9cacb8016b
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T21:36:05.330Z'
    finished_at: '2026-10-28T21:36:05.461Z'
    artifact_digest: a41333b790de757ffcc3bb94a6b7fec98b885a7bec469ee8ee90bb159d4235e9
    contract_hash: f7b5aac306a46cb03fcc6070994a7b6038fd6f6cb95d739f62a4e20092340394
    binding_hash: 8b1565816a12bb9ce08177161ecf74106a188bf96b1ed93e55ab8f340b8d1eec
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