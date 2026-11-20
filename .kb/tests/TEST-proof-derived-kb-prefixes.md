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
    receipt_id: PR-dad20fb59b609cd36bc6d5a3
    test_id: TEST-proof-derived-kb-prefixes
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: cb72452a2b6e9533a029e5e6961dd215f8629c3228410460b4e3d7cba52de7e3
    binding_hash: c45972ffef2a6a4f6f63eb4d59700bbdb7555559f1f41719d0c05d86362270ae
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