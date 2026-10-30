---
title: The staged file coverage result version shall be kibi.staged-file-coverage.v1, by a regex proof
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
    - symbol_id: SYM-proof-staged-file-coverage-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-staged-file-coverage-version
  proves:
    - CLAIM-9C9F066CBB5BD3DB
origin:
  kind: agent
  recorded_at: '2026-10-28T21:03:22.839Z'
id: TEST-proof-staged-file-coverage-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-833baa4ffddf734369732ca7
    test_id: TEST-proof-staged-file-coverage-version
    scope: unit
    outcome: passed
    code_snapshot: e4b745ccbc9bb6ad4c9f14b0630f36b4a2bbe6b0d1a46e6a7a2ab923af3a5908
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T21:05:53.142Z'
    finished_at: '2026-10-28T21:05:53.304Z'
    artifact_digest: 31aaf3300251e6f2cfd75f0124ad4635b5ec78f9f739927e439b6e0c22e53d5c
    contract_hash: 8c6d7d9841c3a0b1c5e4daa3fb489b14af47134315b707c81954d848a4051e61
    binding_hash: ca88fd0ce983f865a1027bea7edb5ab9b2043d1a27199640d34ee502b5f61303
    fingerprint: 8bf64ff0d35d67e553818539aacb400fb7b9f264fdf993ec34b600960ea5ecc5
    fingerprint_components:
      contract: 8c6d7d9841c3a0b1c5e4daa3fb489b14af47134315b707c81954d848a4051e61
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
      - symbol_id: SYM-proof-staged-file-coverage-version
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
      test_id: TEST-proof-staged-file-coverage-version
      pattern:
        symbol_id: SYM-staged-file-coverage-version
        type: string
        value: kibi.staged-file-coverage.v1
    certificate_digest: 006392a2af909b7ccea26bd8765810ea87ec4739eff03f1a4284ca0e41b83a9d
    claim_bindings:
      - claim_key: CLAIM-9C9F066CBB5BD3DB
        requirement_id: REQ-staged-file-coverage-version
        fact_id: FACT-staged-file-coverage-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.staged-file-coverage.v1
---
Proves that the staged file coverage result version shall be kibi.staged-file-coverage.v1, against the code Kibi reads at ingest.