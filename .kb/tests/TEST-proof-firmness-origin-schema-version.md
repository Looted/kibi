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
    receipt_id: PR-6207e2983f2b314762c3be37
    test_id: TEST-proof-firmness-origin-schema-version
    scope: unit
    outcome: passed
    code_snapshot: 4482291090f500187d0aef0ab3a2c32a5c71b564ff0bb3669161e9126e09eccc
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:21:34.607Z'
    finished_at: '2026-10-28T19:21:34.732Z'
    artifact_digest: ba03697852c364ac0baa428b640918807e137d27f714f313ea114160b7286348
    contract_hash: 00283d5a2c6c1fd7dd0e7078b3bf2e19749c587c5ab82ece41e3a8aae61db34a
    binding_hash: 81fea325f20be6d52375985b90ce711c424f5073c75416a8478167fa05e90c7e
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