---
title: 'The Kibi snow brand colour shall be #f4f8fb, by a regex proof'
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-brand-snow-color
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-report-brand-tokens
    export: KIBI_BRAND.snow
  proves:
    - CLAIM-EF539C8110C52A2B
origin:
  kind: agent
  recorded_at: '2026-10-28T22:29:31.858Z'
id: TEST-proof-brand-snow-color
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c776d8639e0a7bf56338ceec
    test_id: TEST-proof-brand-snow-color
    scope: unit
    outcome: passed
    code_snapshot: 0a46a168f79f32c7067fd54b62e7bfea277eb1d3f88ddceab97c98613f8e5f74
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:32:49.455Z'
    finished_at: '2026-10-28T22:32:49.546Z'
    artifact_digest: 4f8880cc4b1295df21113c56bf2ba8c6e47d01ab555dd6b95f976426459bce5b
    contract_hash: ce7f9891b57deca9d269684a988135187020aaa24406891c0c4493bc4786ed65
    binding_hash: adf81ef77ec8110d8a427ed2a5559ab040c833cb69f274c97bc3f9dbf3b881b0
    fingerprint: 74101730268d1e59a814047618dba17592b64ace3f2b9becc660ab777e824400
    fingerprint_components:
      contract: ce7f9891b57deca9d269684a988135187020aaa24406891c0c4493bc4786ed65
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
      - symbol_id: SYM-proof-brand-snow-color
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-brand-snow-color
      pattern:
        symbol_id: SYM-cli-report-brand-tokens
        type: string
        value: '#f4f8fb'
    certificate_digest: 05ef8365e7c029f45356647061e6bb4a57ffa77a46840bffb829e7592c823e53
    claim_bindings:
      - claim_key: CLAIM-EF539C8110C52A2B
        requirement_id: REQ-kibi-report-brand-colors
        fact_id: FACT-brand-snow-color
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: '#f4f8fb'
---
Proves that the Kibi snow brand colour shall be #f4f8fb, against the code Kibi reads at ingest.