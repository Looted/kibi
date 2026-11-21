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
    receipt_id: PR-c51cf30014daf61ca6b4cb12
    test_id: TEST-proof-firmness-origin-schema-version
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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