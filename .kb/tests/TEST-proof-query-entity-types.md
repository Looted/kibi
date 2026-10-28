---
title: A query entity type shall be req, scenario, test, adr, flag, event, symbol or fact, by an exhaustive proof
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
    - symbol_id: SYM-proof-query-entity-types
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-cli-discovery-valid-entity-types
  proves:
    - CLAIM-BF1D7EDFBC9147B1
origin:
  kind: agent
  recorded_at: '2026-10-28T17:24:14.496Z'
id: TEST-proof-query-entity-types
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-076ebfa05fd529d478fc0dc9
    test_id: TEST-proof-query-entity-types
    scope: unit
    outcome: passed
    code_snapshot: 6f361d2b7a0ce4be8a55a8981006015e29d04d73175b724e90cd4a7d0f2b289f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:25:08.242Z'
    finished_at: '2026-10-28T17:25:08.423Z'
    artifact_digest: cb7df160b414d41f867d3e81d6b9e55b1769311c3b808ac1efffb9191b3463b0
    contract_hash: eb35f293da6de683ee54eeec3a0f3f20232612179d3e0d549ed9e9814a933551
    binding_hash: 0095b3945dc277a7c2de9424ca3099f081ed603cfe020c0031a7a686e03b2784
    fingerprint: 92316f94a4320d5ebf0df4a23a4711ad4a210a99069c91d6fe090c589ac2a374
    fingerprint_components:
      contract: eb35f293da6de683ee54eeec3a0f3f20232612179d3e0d549ed9e9814a933551
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
      - symbol_id: SYM-proof-query-entity-types
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
      test_id: TEST-proof-query-entity-types
      domain:
        symbol_id: SYM-cli-discovery-valid-entity-types
        members:
          - req
          - scenario
          - test
          - adr
          - flag
          - event
          - symbol
          - fact
      results:
        - member: req
          outcome: passed
        - member: scenario
          outcome: passed
        - member: test
          outcome: passed
        - member: adr
          outcome: passed
        - member: flag
          outcome: passed
        - member: event
          outcome: passed
        - member: symbol
          outcome: passed
        - member: fact
          outcome: passed
    certificate_digest: 446fb375fd0c34073eb1ef40fba34c32fbd6ba6fc94d75f689f2320483b52b67
    claim_bindings:
      - claim_key: CLAIM-BF1D7EDFBC9147B1
        requirement_id: REQ-kibi-operation-page-sizes
        fact_id: FACT-query-entity-types
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - adr
            - event
            - fact
            - flag
            - req
            - scenario
            - symbol
            - test
---
Proves that a query entity type shall be req, scenario, test, adr, flag, event, symbol or fact, against the code Kibi reads at ingest.