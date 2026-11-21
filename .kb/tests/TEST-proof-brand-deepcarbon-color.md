---
title: 'The Kibi deep carbon brand colour shall be #111318, by a regex proof'
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
    - symbol_id: SYM-proof-brand-deepcarbon-color
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-report-brand-tokens
    export: KIBI_BRAND.deepCarbon
  proves:
    - CLAIM-293B472E51239938
origin:
  kind: agent
  recorded_at: '2026-10-28T22:28:26.761Z'
id: TEST-proof-brand-deepcarbon-color
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f46691ed10512afc8b4499a0
    test_id: TEST-proof-brand-deepcarbon-color
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 6d8350fd9380ac809ba61140cc8b4348f125da52c1412be822efe0450ea9c0ac
    binding_hash: 8bda78524dba33e4be1f05f7095f0e97e98b36944994222d77606b4228718b3f
    fingerprint: 23c8fd4ef588f6c9cff62ea5246800afd53b22c9b0da46736e94f7f1197e19b8
    fingerprint_components:
      contract: 6d8350fd9380ac809ba61140cc8b4348f125da52c1412be822efe0450ea9c0ac
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
      - symbol_id: SYM-proof-brand-deepcarbon-color
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
      test_id: TEST-proof-brand-deepcarbon-color
      pattern:
        symbol_id: SYM-cli-report-brand-tokens
        type: string
        value: '#111318'
    certificate_digest: 10afc4df137de4b4beec1fec5861555ba0592da4f18c504598169394a7a087f0
    claim_bindings:
      - claim_key: CLAIM-293B472E51239938
        requirement_id: REQ-kibi-report-brand-colors
        fact_id: FACT-brand-deepcarbon-color
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: '#111318'
---
Proves that the Kibi deep carbon brand colour shall be #111318, against the code Kibi reads at ingest.