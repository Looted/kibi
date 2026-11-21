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
    receipt_id: PR-cd3692daf730f11a55f2a1cb
    test_id: TEST-proof-receipt-v1-version
    scope: unit
    outcome: passed
    code_snapshot: 7419ad5232bdbe1da8fca26f74b4b9ead24f00ba6d0d7de0f96f555646c2e065
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T21:09:11.644Z'
    finished_at: '2026-11-20T21:19:43.232Z'
    artifact_digest: 7139602fb04835015fd589e7172c5d2d08aef422be8d030f6da4a15ac11ca687
    contract_hash: e4b4c5809d63beb933dfea6a0822b207d0419f6a6de01742174a1acb6d79f4b3
    binding_hash: 1d1de7bc613818bf4810d34f2174aa0cc49f0a16ed35b36245ea6a763e39f296
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