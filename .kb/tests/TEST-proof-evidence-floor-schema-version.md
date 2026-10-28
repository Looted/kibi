---
title: Evidence floors shall start at KB schema version 11, by an arithmetic proof
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
    - symbol_id: SYM-proof-evidence-floor-schema-version
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-evidence-floor-schema-version
  proves:
    - CLAIM-75CDA06E155F91E2
origin:
  kind: agent
  recorded_at: '2026-10-28T20:20:14.551Z'
id: TEST-proof-evidence-floor-schema-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-43af8a3d94eeb0978a3e4562
    test_id: TEST-proof-evidence-floor-schema-version
    scope: unit
    outcome: passed
    code_snapshot: 1527b4cbcc3ade2f38aa86a1134590cb549c79eb8db739cb67bcdea1f5054201
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:24:16.663Z'
    finished_at: '2026-10-28T20:24:16.824Z'
    artifact_digest: bfa797ad5bd5a025e935c7b49d911a8fabade570a9e56d5341cd87bcb210063c
    contract_hash: 17f011bd386b81b6b061409be8d5a126c328e4a5c9f307a63df094d989755008
    binding_hash: e2b31c57dc23eb34316de97940b41059a76a91c61312b90409d1c1fb6788f1a0
    fingerprint: 10afb6cfea3b9b818a8aaa9ddb12fa460b85b2ad8f0e82e21e7be081fc840a0c
    fingerprint_components:
      contract: 17f011bd386b81b6b061409be8d5a126c328e4a5c9f307a63df094d989755008
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
      - symbol_id: SYM-proof-evidence-floor-schema-version
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
      test_id: TEST-proof-evidence-floor-schema-version
      variable: evidence_floor_schema
      value_type: int
      assumptions:
        - operator: eq
          value: 11
      claim:
        operator: eq
        value: 11
    certificate_digest: 2e2d89a20aca720baff066236754ba13c112e4216758ad0dd2668cf61ddc7621
    claim_bindings:
      - claim_key: CLAIM-75CDA06E155F91E2
        requirement_id: REQ-kibi-check-rule-names
        fact_id: FACT-evidence-floor-schema-version
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 11
          value_type: int
          variable: evidence_floor_schema
---
Proves that evidence floors shall start at KB schema version 11, against the code Kibi reads at ingest.