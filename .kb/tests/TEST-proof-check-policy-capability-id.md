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
    receipt_id: PR-3ee9ae2f31f1b084703eee6b
    test_id: TEST-proof-check-policy-capability-id
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 3a246aa9845c2c2eb82900f211060b3aac67bb4e4ac91bd784446254deeb8b3b
    binding_hash: 018c616aad0878f4b8dd1f92f752c55e711222e19733391999c84070ce4952c8
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