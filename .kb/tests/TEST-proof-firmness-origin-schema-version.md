---
title: Firmness shall be read from origin starting with KB schema version 10, by an arithmetic proof
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
    - symbol_id: SYM-proof-firmness-origin-schema-version
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-decision-firmness-firmness-from-origin-schema-version
  proves:
    - CLAIM-60500FD0B06906ED
origin:
  kind: agent
  recorded_at: '2026-10-28T19:20:54.389Z'
id: TEST-proof-firmness-origin-schema-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-0dd7a92c6a17fbccdb95693f
    test_id: TEST-proof-firmness-origin-schema-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 00283d5a2c6c1fd7dd0e7078b3bf2e19749c587c5ab82ece41e3a8aae61db34a
    binding_hash: 248e9fdee71acf970c0aa5419af946340a926ce7fdd43dabaf3974ae4cbdf8a5
    fingerprint: c1de7f9b8248f7cdeff9d411bdf3d960d333dbe2376e09c09b1392b644798b02
    fingerprint_components:
      contract: 00283d5a2c6c1fd7dd0e7078b3bf2e19749c587c5ab82ece41e3a8aae61db34a
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
      - symbol_id: SYM-proof-firmness-origin-schema-version
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
      test_id: TEST-proof-firmness-origin-schema-version
      variable: origin_schema_version
      value_type: int
      assumptions:
        - operator: eq
          value: 10
      claim:
        operator: eq
        value: 10
    certificate_digest: ed985552846dfd5c5f61703f76c1afc43c3dbd752b141266204e94d5c1c853c9
    claim_bindings:
      - claim_key: CLAIM-60500FD0B06906ED
        requirement_id: REQ-kb-firmness-origin-schema
        fact_id: FACT-firmness-origin-schema-version
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 10
          value_type: int
          variable: origin_schema_version
---
Proves that firmness shall be read from origin starting with KB schema version 10, against the code Kibi reads at ingest.