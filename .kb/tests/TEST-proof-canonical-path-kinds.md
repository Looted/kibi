---
title: A canonical entity path shall belong to requirements, scenarios, tests, adr, flags, events, facts or symbols, by an exhaustive proof
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
    - symbol_id: SYM-proof-canonical-path-kinds
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-canonical-CANONICAL_ENTITY_PATHS
  proves:
    - CLAIM-B46994FD5C740451
origin:
  kind: agent
  recorded_at: '2026-10-28T22:33:44.271Z'
id: TEST-proof-canonical-path-kinds
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a7c95e8e396cd9fb9cf3424e
    test_id: TEST-proof-canonical-path-kinds
    scope: unit
    outcome: passed
    code_snapshot: a7ee6e75591f23c8003fd7cb5df9dc7fcc2863290a587f8517f61d409fca336c
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:37:29.716Z'
    finished_at: '2026-10-28T22:37:29.808Z'
    artifact_digest: e6c972f11edba52a8b27a8777e848a56311fd801371dc6979027e7837e3eaf63
    contract_hash: 03daadfbd762d3a393cada941f10af033469d5366765e3912923b89eeccbae66
    binding_hash: 8cd408a9da67fc14497b0f32034194269672f4a195cbc9aa629d6363a92a0299
    fingerprint: 3c62f272afd6c91e486918232127d8d0b642dada6ed2bd20f8d946cabba8d322
    fingerprint_components:
      contract: 03daadfbd762d3a393cada941f10af033469d5366765e3912923b89eeccbae66
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
      - symbol_id: SYM-proof-canonical-path-kinds
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
      test_id: TEST-proof-canonical-path-kinds
      domain:
        symbol_id: SYM-canonical-CANONICAL_ENTITY_PATHS
        members:
          - requirements
          - scenarios
          - tests
          - adr
          - flags
          - events
          - facts
          - symbols
      results:
        - member: requirements
          outcome: passed
        - member: scenarios
          outcome: passed
        - member: tests
          outcome: passed
        - member: adr
          outcome: passed
        - member: flags
          outcome: passed
        - member: events
          outcome: passed
        - member: facts
          outcome: passed
        - member: symbols
          outcome: passed
    certificate_digest: a92aefaf1f8d232774368ca1ed25aac1d2d5248e6a960d2ae2d97d163037627c
    claim_bindings:
      - claim_key: CLAIM-B46994FD5C740451
        requirement_id: REQ-cli-kb-entity-paths
        fact_id: FACT-canonical-path-kinds
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - adr
            - events
            - facts
            - flags
            - requirements
            - scenarios
            - symbols
            - tests
---
Proves that a canonical entity path shall belong to requirements, scenarios, tests, adr, flags, events, facts or symbols, against the code Kibi reads at ingest.