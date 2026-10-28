---
title: An allowed granularity reason shall be config-artifact, module-level-behavior, extractor-miss, legacy-link or test-suite, by an exhaustive proof
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
    - symbol_id: SYM-proof-allowed-granularity-reasons
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-ALLOWED_GRANULARITY_REASONS
  proves:
    - CLAIM-A9B5CB4C46F7AAF7
origin:
  kind: agent
  recorded_at: '2026-10-28T19:10:06.037Z'
id: TEST-proof-allowed-granularity-reasons
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7d854c0a4d26b24de8580462
    test_id: TEST-proof-allowed-granularity-reasons
    scope: unit
    outcome: passed
    code_snapshot: f978b6e9b5fcce43bf3cbf2642f823bfa13a3389978b17ba625fe7b9e3299f1e
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:12:22.999Z'
    finished_at: '2026-10-28T19:12:23.108Z'
    artifact_digest: a4bc91ad24a24a168dbf8ad09621191acb859064c41dcd7b4b870419f8c0c3a1
    contract_hash: 3ea2c5aab42aa414f38a640df44a9ff5ff32b47d7417dfdc0ca2d39afd80cb36
    binding_hash: f59b453ffe474257689bac0fe45bfdf055f0f31184537cd299bdd498053dee8e
    fingerprint: 7473080e5c5835e0f05b3c333880a36fb12f53800a29c32fdd9930ebfa3d32b5
    fingerprint_components:
      contract: 3ea2c5aab42aa414f38a640df44a9ff5ff32b47d7417dfdc0ca2d39afd80cb36
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
      - symbol_id: SYM-proof-allowed-granularity-reasons
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
      test_id: TEST-proof-allowed-granularity-reasons
      domain:
        symbol_id: SYM-ALLOWED_GRANULARITY_REASONS
        members:
          - config-artifact
          - module-level-behavior
          - extractor-miss
          - legacy-link
          - test-suite
      results:
        - member: config-artifact
          outcome: passed
        - member: module-level-behavior
          outcome: passed
        - member: extractor-miss
          outcome: passed
        - member: legacy-link
          outcome: passed
        - member: test-suite
          outcome: passed
    certificate_digest: 7b426f519fb1d5917be7f7a4db632356391c0700e2855d8fbb77ba3f3bcd0763
    claim_bindings:
      - claim_key: CLAIM-A9B5CB4C46F7AAF7
        requirement_id: REQ-symbol-granularity-vocabulary
        fact_id: FACT-allowed-granularity-reasons
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - config-artifact
            - extractor-miss
            - legacy-link
            - module-level-behavior
            - test-suite
---
Proves that an allowed granularity reason shall be config-artifact, module-level-behavior, extractor-miss, legacy-link or test-suite, against the code Kibi reads at ingest.