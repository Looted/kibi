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
    receipt_id: PR-a82c40e465914b7152d1ee8b
    test_id: TEST-proof-github-badge-alt
    scope: unit
    outcome: passed
    code_snapshot: 7f5f3cbf07bcd668a6ba1d822ce431959e51a6f2bdc18ca3aef8600b71016261
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T10:24:06.609Z'
    finished_at: '2026-10-29T10:24:06.799Z'
    artifact_digest: b28b2918b3061284c568b233dd18f3ad3417b871f1e61a3f67f6d9d03b8a68bd
    contract_hash: 90392bc9993abc793e7baee144a571bd182a6caed489f3f40741973fc246c61e
    binding_hash: f162b7e2694fc4e06ac8a9cbe9811d1799eefc389f45920886ef7e8f96e549cc
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