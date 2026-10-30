---
title: 'The Kibi danger brand colour shall be #f07178, by a regex proof'
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
    - symbol_id: SYM-proof-brand-danger-color
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-report-brand-tokens
    export: KIBI_BRAND.danger
  proves:
    - CLAIM-A5F9B7D9BBEFB706
origin:
  kind: agent
  recorded_at: '2026-10-28T22:30:54.100Z'
id: TEST-proof-brand-danger-color
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-db8567131e507a3e3211a5dd
    test_id: TEST-proof-brand-danger-color
    scope: unit
    outcome: passed
    code_snapshot: 0a46a168f79f32c7067fd54b62e7bfea277eb1d3f88ddceab97c98613f8e5f74
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:33:15.134Z'
    finished_at: '2026-10-28T22:33:15.221Z'
    artifact_digest: 6639c3187eb9bb70fc47a25e3a817bdaa3bef56b701961c79d1aa804e9ac3a28
    contract_hash: 3fbc05a28c6dd4f4388796b1829c191b61ed3e8dd887d7b6ba62026d6e714fe9
    binding_hash: 8a403c47bced5826374bf953af2ca738214337f9763c490608778eddb29f266c
    fingerprint: 2670baf1ec40b28c044164ff4ff4b660ac3bd8d85f20d1e578d0a2d177dc1168
    fingerprint_components:
      contract: 3fbc05a28c6dd4f4388796b1829c191b61ed3e8dd887d7b6ba62026d6e714fe9
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
      - symbol_id: SYM-proof-brand-danger-color
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
      test_id: TEST-proof-brand-danger-color
      pattern:
        symbol_id: SYM-cli-report-brand-tokens
        type: string
        value: '#f07178'
    certificate_digest: ecbf11c3c438f72a0b659674d5c7c970af26eed70f557fc9d83b979e58e1d347
    claim_bindings:
      - claim_key: CLAIM-A5F9B7D9BBEFB706
        requirement_id: REQ-kibi-report-brand-colors
        fact_id: FACT-brand-danger-color
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: '#f07178'
---
Proves that the Kibi danger brand colour shall be #f07178, against the code Kibi reads at ingest.