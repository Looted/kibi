---
title: The Kibi badge alt text shall be Kibi requirement health, by a regex proof
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
    - symbol_id: SYM-proof-github-badge-alt
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-github-badge-alt
  proves:
    - CLAIM-FE6DF54E668EEA7E
origin:
  kind: agent
  recorded_at: '2026-10-29T10:19:50.014Z'
id: TEST-proof-github-badge-alt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-42fa4697dd4f6f84b4d81098
    test_id: TEST-proof-github-badge-alt
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 90392bc9993abc793e7baee144a571bd182a6caed489f3f40741973fc246c61e
    binding_hash: 075d4a0789b774d62991e6d2dd705abb80cae17b43138bd3b385c8470b4e7285
    fingerprint: 4f12c9a506afd64ed23dd9a6826d09f2560dcd2d434478559f8ebd95fe9502da
    fingerprint_components:
      contract: 90392bc9993abc793e7baee144a571bd182a6caed489f3f40741973fc246c61e
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
      - symbol_id: SYM-proof-github-badge-alt
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
      test_id: TEST-proof-github-badge-alt
      pattern:
        symbol_id: SYM-cli-github-badge-alt
        type: string
        value: Kibi requirement health
    certificate_digest: 014084d7e432438fe84d6326731ab5c0c4aa182edfa5506f384d142c27f580b8
    claim_bindings:
      - claim_key: CLAIM-FE6DF54E668EEA7E
        requirement_id: REQ-kibi-github-report-settings
        fact_id: FACT-github-badge-alt
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: Kibi requirement health
---
Proves that the Kibi badge alt text shall be Kibi requirement health, against the code Kibi reads at ingest.