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
    receipt_id: PR-1525a4d80a693e75a02a621b
    test_id: TEST-proof-brand-snow-color
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: ce7f9891b57deca9d269684a988135187020aaa24406891c0c4493bc4786ed65
    binding_hash: 613e42e28c6078b8bd655bd967be75e82235268555d8f9d32344526ee516d44b
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