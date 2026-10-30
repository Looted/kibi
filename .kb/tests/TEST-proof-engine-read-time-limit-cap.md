---
title: The engine read time limit cap shall be 115000 milliseconds, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-engine-read-time-limit-cap
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-engine-limits-read-time-limit-cap
  proves:
    - CLAIM-446DAB32C6107945
origin:
  kind: agent
  recorded_at: '2026-10-28T10:31:58.563Z'
id: TEST-proof-engine-read-time-limit-cap
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-838f3014030e53a8ed9404bd
    test_id: TEST-proof-engine-read-time-limit-cap
    scope: unit
    outcome: passed
    code_snapshot: 7e969ef237f833cbd278efff81b932f3dfabb54a084313f49df8411b804224eb
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:32:44.490Z'
    finished_at: '2026-10-28T10:32:44.607Z'
    artifact_digest: 415da05ab4eee56740ceb2b4c6674ac31a0d909fdafc5e53aa8b8a557e7aba5a
    contract_hash: 064375d559fc1b759a08544f95464056a5005e4dde94b1a93856b9d2dadc421c
    binding_hash: a387fa2a5c3bc56dc6186e4105d28cc8ec1aa5aa02c711223b3799ece415cd2f
    fingerprint: c462ebb702ee1eaa2bbb38ff65ec0270a5cbde3b5eba58a356d0fd8601cbba30
    fingerprint_components:
      contract: 064375d559fc1b759a08544f95464056a5005e4dde94b1a93856b9d2dadc421c
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
      - symbol_id: SYM-proof-engine-read-time-limit-cap
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-engine-read-time-limit-cap
      variable: read_time_limit_cap_ms
      value_type: int
      assumptions:
        - operator: eq
          value: 115000
      claim:
        operator: eq
        value: 115000
    certificate_digest: 03b84b2c4f0c0a892e3a4788931314c597102c014ebebb95233ea7a2942d4499
    claim_bindings:
      - claim_key: CLAIM-446DAB32C6107945
        requirement_id: REQ-core-engine-read-limit-settings
        fact_id: FACT-engine-read-time-limit-cap
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 115000
          value_type: int
          variable: read_time_limit_cap_ms
---
Proves that the engine read time limit cap shall be 115000 milliseconds, against the code Kibi reads at ingest.