---
title: A check policy plugin contract shall be kibi.check-policy.v1, by a regex proof
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
    - symbol_id: SYM-proof-check-policy-contract-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-check-policy-contract-version
  proves:
    - CLAIM-01D7E1782A68ED2E
origin:
  kind: agent
  recorded_at: '2026-10-29T16:59:21.876Z'
id: TEST-proof-check-policy-contract-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-aaca3a1bf7872e2d386d09d4
    test_id: TEST-proof-check-policy-contract-version
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 5922887bce82300ad887dba68ff570033fea82dac85abe44741674e5cf845a91
    binding_hash: 4633778ae6694813959b96bc5f0ebb6fcadc562a7f87aa699a8dc286ab5ec88f
    fingerprint: 6fd07fc903e6f815af87f262386a4be42d75539e3ec2e00048db7986a7ee0de6
    fingerprint_components:
      contract: 5922887bce82300ad887dba68ff570033fea82dac85abe44741674e5cf845a91
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
      - symbol_id: SYM-proof-check-policy-contract-version
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
      test_id: TEST-proof-check-policy-contract-version
      pattern:
        symbol_id: SYM-const-check-policy-contract-version
        type: string
        value: kibi.check-policy.v1
    certificate_digest: 39002d30a75c8dc20a2b0a9cad61f36b31c073367ad8c8ae1d78a9c7b3ab2088
    claim_bindings:
      - claim_key: CLAIM-01D7E1782A68ED2E
        requirement_id: REQ-capability-check-policy-version
        fact_id: FACT-check-policy-contract-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.check-policy.v1
---
Proves that a check policy plugin contract shall be kibi.check-policy.v1, against the code Kibi reads at ingest.