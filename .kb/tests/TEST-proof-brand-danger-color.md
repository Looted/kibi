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
    receipt_id: PR-26feed2a5a9dfd7a80da9300
    test_id: TEST-proof-brand-danger-color
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 3fbc05a28c6dd4f4388796b1829c191b61ed3e8dd887d7b6ba62026d6e714fe9
    binding_hash: 79ed6f1f7894d1bb3640c4bcfa45ffb393e74d5e06051d538616ac55f12b4df1
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