---
title: Entity origins shall arrive with KB schema version 6, by an arithmetic proof
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
    - symbol_id: SYM-proof-origin-schema-version
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-migration-origin-schema-version
  proves:
    - CLAIM-D0400FA6B7A49F88
origin:
  kind: agent
  recorded_at: '2026-10-28T18:49:05.710Z'
id: TEST-proof-origin-schema-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a61967ba8dc0db035879c3b1
    test_id: TEST-proof-origin-schema-version
    scope: unit
    outcome: passed
    code_snapshot: dc0be4d5803f22ca38ce1004b6769d2368029ae49edea82620e6c6618cbf4d3a
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T18:52:37.119Z'
    finished_at: '2026-10-28T18:52:37.267Z'
    artifact_digest: 57130ca9a57ffe84a609ccdd431f625ee51f5f1605f3f1b5730dc81a8f2febd1
    contract_hash: 012655384bcecd7abdeebb20c603667b923009831deb494a7f4d0182914342a7
    binding_hash: 4311edf253445942f3826276d1fc381021f60f9c315858d237d6678554e2bb50
    fingerprint: caec8ee40a7d608ce03f8223039bcc6f681435366109df2a3c0e228a91fc14a2
    fingerprint_components:
      contract: 012655384bcecd7abdeebb20c603667b923009831deb494a7f4d0182914342a7
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
      - symbol_id: SYM-proof-origin-schema-version
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
      test_id: TEST-proof-origin-schema-version
      variable: origin_schema_version
      value_type: int
      assumptions:
        - operator: eq
          value: 6
      claim:
        operator: eq
        value: 6
    certificate_digest: 8f321eb24d63088856fd4395b948e942c1b6190160aeeea6d35f1f929785e3a3
    claim_bindings:
      - claim_key: CLAIM-D0400FA6B7A49F88
        requirement_id: REQ-cli-schema-migration-codes
        fact_id: FACT-origin-schema-version
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 6
          value_type: int
          variable: origin_schema_version
---
Proves that entity origins shall arrive with KB schema version 6, against the code Kibi reads at ingest.