---
title: The first proof receipt version shall be kibi.proof-receipt.v1, by a regex proof
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
    - symbol_id: SYM-proof-receipt-v1-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-proof-receipt-v1-version
  proves:
    - CLAIM-661EF1D4E168CEBE
origin:
  kind: agent
  recorded_at: '2026-10-28T20:41:23.958Z'
id: TEST-proof-receipt-v1-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-44045a25fae672c74fc32f5f
    test_id: TEST-proof-receipt-v1-version
    scope: unit
    outcome: passed
    code_snapshot: 0e92ecb6e2415cb6b44cd4648abe5bf8c9c235c18d9f56844e07e29be087804d
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T11:21:23.092Z'
    finished_at: '2026-11-16T11:22:49.884Z'
    artifact_digest: 4c5ff880d8b0e5e45dca5d0803c0c793347804c85ecfaa631ec1e84c2fe84bfa
    contract_hash: e4b4c5809d63beb933dfea6a0822b207d0419f6a6de01742174a1acb6d79f4b3
    binding_hash: f864a72c30a1c156e4f79e8b08a3786d027652be3678a2baab8d18dac6056a82
    fingerprint: 242f3efcb2b3522baa3b0593ffbef1699d1cb336c958598973470f1b53654d0d
    fingerprint_components:
      contract: e4b4c5809d63beb933dfea6a0822b207d0419f6a6de01742174a1acb6d79f4b3
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
      - symbol_id: SYM-proof-receipt-v1-version
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
      test_id: TEST-proof-receipt-v1-version
      pattern:
        symbol_id: SYM-const-proof-receipt-v1-version
        type: string
        value: kibi.proof-receipt.v1
    certificate_digest: a4b9a06b561361b27007462ee7a276e047db11b707fd56c75d39cd77ce510f9d
    claim_bindings:
      - claim_key: CLAIM-661EF1D4E168CEBE
        requirement_id: REQ-kibi-proof-receipt-format
        fact_id: FACT-receipt-v1-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.proof-receipt.v1
---
Proves that the first proof receipt version shall be kibi.proof-receipt.v1, against the code Kibi reads at ingest.