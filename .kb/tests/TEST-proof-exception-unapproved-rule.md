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
    receipt_id: PR-00b27bcd69e27b6c44042baf
    test_id: TEST-proof-exception-unapproved-rule
    scope: unit
    outcome: passed
    code_snapshot: e25a1f0385dac8dcff3382f76f7940204d134ea7aa298c9b083cb2fcd11015b2
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-04T18:30:22.429Z'
    finished_at: '2026-11-04T18:30:22.568Z'
    artifact_digest: 1d30e7e242d7aa2ed30634448587f34a6abca929647fdb29cb7a9fa5fb314b87
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