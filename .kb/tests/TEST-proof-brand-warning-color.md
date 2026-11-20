---
title: 'The Kibi warning brand colour shall be #f2b84b, by a regex proof'
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
    - symbol_id: SYM-proof-brand-warning-color
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-report-brand-tokens
    export: KIBI_BRAND.warning
  proves:
    - CLAIM-B65B34155577E262
origin:
  kind: agent
  recorded_at: '2026-10-28T22:30:37.403Z'
id: TEST-proof-brand-warning-color
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-357193be0e7e74255f5550ca
    test_id: TEST-proof-brand-warning-color
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 56b3519a2303f079aa0cd5071a1fe31b713bd624d2e9d472d125994e77938f93
    binding_hash: 2129461860c0fc7d04304e4a6337bfa02455211fad4c5a5334fcd9e3c449c252
    fingerprint: 33deea098327ce8929dbfc397de28dd76de9c032b11ce57bc32e67907b606f0f
    fingerprint_components:
      contract: 56b3519a2303f079aa0cd5071a1fe31b713bd624d2e9d472d125994e77938f93
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
      - symbol_id: SYM-proof-brand-warning-color
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
      test_id: TEST-proof-brand-warning-color
      pattern:
        symbol_id: SYM-cli-report-brand-tokens
        type: string
        value: '#f2b84b'
    certificate_digest: d0f5144238bdb2eccd68239edca1669f416e44686a7c18764d77705e9253f084
    claim_bindings:
      - claim_key: CLAIM-B65B34155577E262
        requirement_id: REQ-kibi-report-brand-colors
        fact_id: FACT-brand-warning-color
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: '#f2b84b'
---
Proves that the Kibi warning brand colour shall be #f2b84b, against the code Kibi reads at ingest.