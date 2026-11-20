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
    receipt_id: PR-e4e77e5b24ad6042b4e29e4a
    test_id: TEST-proof-origin-schema-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 012655384bcecd7abdeebb20c603667b923009831deb494a7f4d0182914342a7
    binding_hash: 9f49f7344da9d434c433a764cdb5eea5e87ef8afcfcfaa5eac8f9191b2240420
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