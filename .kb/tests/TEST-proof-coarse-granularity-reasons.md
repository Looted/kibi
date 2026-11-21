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
    receipt_id: PR-fbff1d449cd34484d9296abf
    test_id: TEST-proof-coarse-granularity-reasons
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: c15d4ddce48f2a2045cb665963c24bd17d58d54fb6c90313fc486dc4245418a5
    binding_hash: 39ba5547c50daedf933f00c94bb4c0e8388e668b4d3d85df0b3a7bfc6ca016be
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