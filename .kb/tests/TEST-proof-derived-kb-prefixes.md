---
title: The derived KB folders shall be .kb/branches, .kb/recovery, .kb/proof/runs, .kb/briefs and .kb/migrations, by an exhaustive proof
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-derived-kb-prefixes
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-canonical-DERIVED_KB_PREFIXES
  proves:
    - CLAIM-E2AE94CB45988C06
origin:
  kind: agent
  recorded_at: '2026-10-28T19:01:26.270Z'
id: TEST-proof-derived-kb-prefixes
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3ea2acc8058db679eba31d10
    test_id: TEST-proof-derived-kb-prefixes
    scope: unit
    outcome: passed
    code_snapshot: 5d36459f22881f6c22e3bac5ea8974c74bd15e1de4958b06df142b9e5eb07350
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:03:18.079Z'
    finished_at: '2026-10-28T19:03:18.170Z'
    artifact_digest: 2059a423c24a0cecc395b1576f89dfffda8b477577a5b6a65fbe7337bf18c56d
    contract_hash: cb72452a2b6e9533a029e5e6961dd215f8629c3228410460b4e3d7cba52de7e3
    binding_hash: fe0d6e63e3a41c6c248e07d7c73c4fc7638069fe16a64d6eb447bae0a84b0e90
    fingerprint: 14c077702d8d4021e81b99f90c9b71c5c78c26ff1d6c4202a4916e078f9238ca
    fingerprint_components:
      contract: cb72452a2b6e9533a029e5e6961dd215f8629c3228410460b4e3d7cba52de7e3
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
      - symbol_id: SYM-proof-derived-kb-prefixes
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-proof-derived-kb-prefixes
      domain:
        symbol_id: SYM-canonical-DERIVED_KB_PREFIXES
        members:
          - .kb/branches
          - .kb/recovery
          - .kb/proof/runs
          - .kb/briefs
          - .kb/migrations
      results:
        - member: .kb/branches
          outcome: passed
        - member: .kb/recovery
          outcome: passed
        - member: .kb/proof/runs
          outcome: passed
        - member: .kb/briefs
          outcome: passed
        - member: .kb/migrations
          outcome: passed
    certificate_digest: caaf62b357633e4ee6c37e0d22d01a76aa3ce6cf4e6292820b67bb91b93ad40f
    claim_bindings:
      - claim_key: CLAIM-E2AE94CB45988C06
        requirement_id: REQ-cli-kb-layout-paths
        fact_id: FACT-derived-kb-prefixes
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - .kb/branches
            - .kb/briefs
            - .kb/migrations
            - .kb/proof/runs
            - .kb/recovery
---
Proves that the derived KB folders shall be .kb/branches, .kb/recovery, .kb/proof/runs, .kb/briefs and .kb/migrations, against the code Kibi reads at ingest.