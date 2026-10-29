---
title: A Kibi brand colour shall be carbon, deepCarbon, panel, ice, signal, snow, mist, rail, success, warning or danger, by an exhaustive proof
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
    - symbol_id: SYM-proof-brand-color-names
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-cli-report-brand-tokens
  proves:
    - CLAIM-13A7E1BD0A658DBA
origin:
  kind: agent
  recorded_at: '2026-10-28T22:27:53.646Z'
id: TEST-proof-brand-color-names
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-442d4bec3083852995e18f63
    test_id: TEST-proof-brand-color-names
    scope: unit
    outcome: passed
    code_snapshot: 0a46a168f79f32c7067fd54b62e7bfea277eb1d3f88ddceab97c98613f8e5f74
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:32:18.177Z'
    finished_at: '2026-10-28T22:32:18.260Z'
    artifact_digest: 7de1ca4b5aa0134ab59a30bb1a5ec5c662b8a50cc944a5671a5f8c04c28c6a2f
    contract_hash: 98dcbda85ea01cc27c2b943c3436e6b188494f2b3c9c3f919bba4b26e1a01774
    binding_hash: 4cc56435ba71823ff42df4f61ea3c73aded5e27e7fc73f1c2cd3473c671a8753
    fingerprint: 9a6c9953f1660a0e340e3870cffb4d96daff6fcf4c2f40d8148dae218ed3ddae
    fingerprint_components:
      contract: 98dcbda85ea01cc27c2b943c3436e6b188494f2b3c9c3f919bba4b26e1a01774
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
      - symbol_id: SYM-proof-brand-color-names
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
      test_id: TEST-proof-brand-color-names
      domain:
        symbol_id: SYM-cli-report-brand-tokens
        members:
          - carbon
          - deepCarbon
          - panel
          - ice
          - signal
          - snow
          - mist
          - rail
          - success
          - warning
          - danger
      results:
        - member: carbon
          outcome: passed
        - member: deepCarbon
          outcome: passed
        - member: panel
          outcome: passed
        - member: ice
          outcome: passed
        - member: signal
          outcome: passed
        - member: snow
          outcome: passed
        - member: mist
          outcome: passed
        - member: rail
          outcome: passed
        - member: success
          outcome: passed
        - member: warning
          outcome: passed
        - member: danger
          outcome: passed
    certificate_digest: 53370fabb52a6f1fe934829ff43fce0610f8b2e5651e047be9dd7aca0ef7571d
    claim_bindings:
      - claim_key: CLAIM-13A7E1BD0A658DBA
        requirement_id: REQ-kibi-report-brand-colors
        fact_id: FACT-brand-color-names
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - carbon
            - danger
            - deepCarbon
            - ice
            - mist
            - panel
            - rail
            - signal
            - snow
            - success
            - warning
---
Proves that a Kibi brand colour shall be carbon, deepCarbon, panel, ice, signal, snow, mist, rail, success, warning or danger, against the code Kibi reads at ingest.