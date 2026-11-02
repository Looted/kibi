---
title: The check policy capability id shall be kibi.check-policy.v1, by a regex proof
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
    - symbol_id: SYM-proof-check-policy-capability-id
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-check-policy-capability-id
  proves:
    - CLAIM-DF4B0268FE1A8B50
origin:
  kind: agent
  recorded_at: '2026-10-28T10:49:33.553Z'
id: TEST-proof-check-policy-capability-id
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c688c4258a94fea53b9e22a1
    test_id: TEST-proof-check-policy-capability-id
    scope: unit
    outcome: passed
    code_snapshot: e2663d10a2e1a0b8fdd0d38e888ee46d8031436be2244a613e1c406fbfa714b0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-30T19:51:58.079Z'
    finished_at: '2026-10-30T19:51:58.199Z'
    artifact_digest: 5303ffdb2834dffe67f9dfc2e96c011a740b390b5208b6324ac505407522b804
    contract_hash: 3a246aa9845c2c2eb82900f211060b3aac67bb4e4ac91bd784446254deeb8b3b
    binding_hash: 10b718c0f0fb639f2c0924f2f8a7fbf8a5d04b8a73d7e28f6215593d1891f52c
    fingerprint: f8f0ca408192f8269e8f693272f1f37280038c72f195df542f054923bda37510
    fingerprint_components:
      contract: 3a246aa9845c2c2eb82900f211060b3aac67bb4e4ac91bd784446254deeb8b3b
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
      - symbol_id: SYM-proof-check-policy-capability-id
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
      test_id: TEST-proof-check-policy-capability-id
      pattern:
        symbol_id: SYM-const-check-policy-capability-id
        type: string
        value: kibi.check-policy.v1
    certificate_digest: 16e1fc2cf5727b087748df6272da747f6a4da2dc01a27774261c88592b8110a6
    claim_bindings:
      - claim_key: CLAIM-DF4B0268FE1A8B50
        requirement_id: REQ-capability-plugin-protocol-identifiers
        fact_id: FACT-check-policy-capability-id
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.check-policy.v1
---
Proves that the check policy capability id shall be kibi.check-policy.v1, against the code Kibi reads at ingest.