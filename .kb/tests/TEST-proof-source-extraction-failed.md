---
title: The failed source extraction code shall be source_extraction_failed, by a regex proof
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
    - symbol_id: SYM-proof-source-extraction-failed
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-sync-source-extraction-failed-code
  proves:
    - CLAIM-0874142625D2A148
origin:
  kind: agent
  recorded_at: '2026-10-28T19:08:32.676Z'
id: TEST-proof-source-extraction-failed
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-78fd4e5d7ada234e136f6a8a
    test_id: TEST-proof-source-extraction-failed
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: e11872da2268b81ed46d8986801f26a8dd0b8ca4980fa3dcb37581739c5d810b
    binding_hash: c1e71860a99e0ecc333486cfe6fcbb493aea904813e116dbcd8ce38151b7714d
    fingerprint: a5380d448abfb3a4295628c78e3f786e138df02fea2a0e85998409a78fbad9dc
    fingerprint_components:
      contract: e11872da2268b81ed46d8986801f26a8dd0b8ca4980fa3dcb37581739c5d810b
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
      - symbol_id: SYM-proof-source-extraction-failed
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
      test_id: TEST-proof-source-extraction-failed
      pattern:
        symbol_id: SYM-sync-source-extraction-failed-code
        type: string
        value: source_extraction_failed
    certificate_digest: 0f06963f3501a35479403c80293439f371d8785e52c9eab1aac740a91818a01b
    claim_bindings:
      - claim_key: CLAIM-0874142625D2A148
        requirement_id: REQ-uncompiled-source-code
        fact_id: FACT-source-extraction-failed
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: source_extraction_failed
---
Proves that the failed source extraction code shall be source_extraction_failed, against the code Kibi reads at ingest.