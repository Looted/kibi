---
title: The unapproved exception rule shall be exception-unapproved, by a regex proof
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
    - symbol_id: SYM-proof-exception-unapproved-rule
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-exception-unapproved-rule
  proves:
    - CLAIM-18FA2C11AFA7F302
origin:
  kind: agent
  recorded_at: '2026-10-28T20:21:00.934Z'
id: TEST-proof-exception-unapproved-rule
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4c3b1e0887522bd368637ce4
    test_id: TEST-proof-exception-unapproved-rule
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 37f8cef41d1e6609f687565b893bfb4877f5984224f91584a5f60a4d70bf21f5
    binding_hash: 2b8d8a94aa0f3a0493a2a2b2c14bb1e6f168c7a9b4dbdf6002599f96e963450d
    fingerprint: b6620364d30c82fd9dcea3c0b09ac9506de05982ef4c9d3cc4a3654301a220b4
    fingerprint_components:
      contract: 37f8cef41d1e6609f687565b893bfb4877f5984224f91584a5f60a4d70bf21f5
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
      - symbol_id: SYM-proof-exception-unapproved-rule
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
      test_id: TEST-proof-exception-unapproved-rule
      pattern:
        symbol_id: SYM-const-exception-unapproved-rule
        type: string
        value: exception-unapproved
    certificate_digest: 59350def89c917d908a7439899a6751d3cbba1fb3e568c31e92b099aa07141b3
    claim_bindings:
      - claim_key: CLAIM-18FA2C11AFA7F302
        requirement_id: REQ-kibi-origin-review-rule-names
        fact_id: FACT-exception-unapproved-rule
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: exception-unapproved
---
Proves that the unapproved exception rule shall be exception-unapproved, against the code Kibi reads at ingest.