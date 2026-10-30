---
title: The dangling source path check rule shall be source-path-dangling, by a regex proof
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
    - symbol_id: SYM-proof-source-path-dangling-rule
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-source-path-dangling-SOURCE_PATH_DANGLING_RULE
  proves:
    - CLAIM-9573897FBAE210B4
origin:
  kind: agent
  recorded_at: '2026-10-28T17:27:52.198Z'
id: TEST-proof-source-path-dangling-rule
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-09d4ab12bb216a7fc8cb0df0
    test_id: TEST-proof-source-path-dangling-rule
    scope: unit
    outcome: passed
    code_snapshot: 4b699c9b07afd709892fdd2513cb5f73a7167d1881b1a2daf6c70078e8f98147
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:30:56.688Z'
    finished_at: '2026-10-28T17:30:56.835Z'
    artifact_digest: ea0f256c5896e333bc60f87169c5cc8a10af232efb82a63b63fc693c58add3ca
    contract_hash: b4fafd8920e32f5af7ec2567a5eb18126d9345b044e83326f6270c7edaed6e50
    binding_hash: 5b296d5a67fcc839148f4e745e5689fa5294e5bf0f6fbc651046d774f6d81a3c
    fingerprint: d516889059d84de040fd1e12666e8651b12fa3b5c0d7c49642364cdf57d83b0a
    fingerprint_components:
      contract: b4fafd8920e32f5af7ec2567a5eb18126d9345b044e83326f6270c7edaed6e50
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
      - symbol_id: SYM-proof-source-path-dangling-rule
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
      test_id: TEST-proof-source-path-dangling-rule
      pattern:
        symbol_id: SYM-source-path-dangling-SOURCE_PATH_DANGLING_RULE
        type: string
        value: source-path-dangling
    certificate_digest: ae751f46f28935307be9c5b160495d74a742405897e7c249c6b0fa753bb7041d
    claim_bindings:
      - claim_key: CLAIM-9573897FBAE210B4
        requirement_id: REQ-kibi-lifecycle-check-codes
        fact_id: FACT-source-path-dangling-rule
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: source-path-dangling
---
Proves that the dangling source path check rule shall be source-path-dangling, against the code Kibi reads at ingest.