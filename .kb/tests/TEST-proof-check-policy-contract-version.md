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
    receipt_id: PR-506edd140d8466db4593df28
    test_id: TEST-proof-check-policy-contract-version
    scope: unit
    outcome: passed
    code_snapshot: 5cf1b6f3d9ec9f667fb67722a085c1d8935f2fee5aa8dfd80b2e7a83820ab8aa
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T17:00:01.095Z'
    finished_at: '2026-10-29T17:00:01.240Z'
    artifact_digest: 20f855f2b9d0cc5f71408f4ff49c1d22dd5383a4057e49ac8648a02f55ccc6f9
    contract_hash: 5922887bce82300ad887dba68ff570033fea82dac85abe44741674e5cf845a91
    binding_hash: dd1e592e14c9dc204b83d1894207a6e16d2581b1aa667d935364e9d5047639dd
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