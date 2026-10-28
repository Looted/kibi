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
    receipt_id: PR-83d8d5e998bafd0f8b55c8a4
    test_id: TEST-proof-exception-unapproved-rule
    scope: unit
    outcome: passed
    code_snapshot: 1527b4cbcc3ade2f38aa86a1134590cb549c79eb8db739cb67bcdea1f5054201
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:24:28.282Z'
    finished_at: '2026-10-28T20:24:28.436Z'
    artifact_digest: ab885287ab09942401cfe9a194c569372a9d338183786a69102a788979734b54
    contract_hash: 37f8cef41d1e6609f687565b893bfb4877f5984224f91584a5f60a4d70bf21f5
    binding_hash: a57b6b1eca8c30b1458df521c882187a4d1325db8dec4a6e9389ccc67da5f2df
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
        requirement_id: REQ-kibi-check-rule-names
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