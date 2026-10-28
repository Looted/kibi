---
title: A coarse granularity reason shall be config-artifact, module-level-behavior, extractor-miss or test-suite, by an exhaustive proof
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
    - symbol_id: SYM-proof-coarse-granularity-reasons
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-COARSE_GRANULARITY_REASONS
  proves:
    - CLAIM-C525D425817BE74B
origin:
  kind: agent
  recorded_at: '2026-10-28T19:10:23.071Z'
id: TEST-proof-coarse-granularity-reasons
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-510cf81d99338dc9467935d6
    test_id: TEST-proof-coarse-granularity-reasons
    scope: unit
    outcome: passed
    code_snapshot: f978b6e9b5fcce43bf3cbf2642f823bfa13a3389978b17ba625fe7b9e3299f1e
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:12:28.603Z'
    finished_at: '2026-10-28T19:12:28.715Z'
    artifact_digest: 878ef894dc1e279a926e541b2a6ff2c6f0711c891c0c95e85db7bbd60adf1bc9
    contract_hash: c15d4ddce48f2a2045cb665963c24bd17d58d54fb6c90313fc486dc4245418a5
    binding_hash: 9d5f8c8d37c3af1678db4574641938cc91b83213d1ac09d6c792e842cdb33377
    fingerprint: bb9057b2f784f33d1a2125368cf61dcc4886c52b07d3dc6135e66fe67e1c18a2
    fingerprint_components:
      contract: c15d4ddce48f2a2045cb665963c24bd17d58d54fb6c90313fc486dc4245418a5
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
      - symbol_id: SYM-proof-coarse-granularity-reasons
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
      test_id: TEST-proof-coarse-granularity-reasons
      domain:
        symbol_id: SYM-COARSE_GRANULARITY_REASONS
        members:
          - config-artifact
          - module-level-behavior
          - extractor-miss
          - test-suite
      results:
        - member: config-artifact
          outcome: passed
        - member: module-level-behavior
          outcome: passed
        - member: extractor-miss
          outcome: passed
        - member: test-suite
          outcome: passed
    certificate_digest: af2a24f6bf36ba36447bf32b7568019b787b31347d9bc2302818ceee2e589d04
    claim_bindings:
      - claim_key: CLAIM-C525D425817BE74B
        requirement_id: REQ-symbol-granularity-vocabulary
        fact_id: FACT-coarse-granularity-reasons
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - config-artifact
            - extractor-miss
            - module-level-behavior
            - test-suite
---
Proves that a coarse granularity reason shall be config-artifact, module-level-behavior, extractor-miss or test-suite, against the code Kibi reads at ingest.