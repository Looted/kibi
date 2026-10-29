---
title: A proof contract kind shall be e2e, example, property, exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source, by an exhaustive proof
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
    - symbol_id: SYM-proof-proof-contract-kinds
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-proof-kinds
  proves:
    - CLAIM-D7B715B13C00E1A9
origin:
  kind: agent
  recorded_at: '2026-10-29T16:44:58.349Z'
id: TEST-proof-proof-contract-kinds
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-897e491c3f1cc7f622a7fb3f
    test_id: TEST-proof-proof-contract-kinds
    scope: unit
    outcome: passed
    code_snapshot: 3ef679be4889b29bbf2035f91775c6f274ff1378dfca354d2d0e2fee8d047f47
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:50:01.541Z'
    finished_at: '2026-10-29T16:50:01.690Z'
    artifact_digest: 45f6cf44539a7459aa9789c1d4910386f12fa0473adae67e21ce995dc1828679
    contract_hash: 72eaf63a93cbc4ef0b23fb7dd6cb25a8bdf19bc525a7fbd7c09af3a5274d81fb
    binding_hash: 6d5f562fe0b1e6067d03f3e8d67eb1501cae8dec9e9d0e4dfaea8d5f26473619
    fingerprint: 39107731c440b0f68b2081f9edb7f1e471355fbedee9c686bef35567cfffeec3
    fingerprint_components:
      contract: 72eaf63a93cbc4ef0b23fb7dd6cb25a8bdf19bc525a7fbd7c09af3a5274d81fb
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
      - symbol_id: SYM-proof-proof-contract-kinds
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
      test_id: TEST-proof-proof-contract-kinds
      domain:
        symbol_id: SYM-proof-kinds
        members:
          - e2e
          - example
          - property
          - exhaustive
          - typecheck
          - arithmetic
          - smt
          - rule
          - state_machine
          - regex
          - source
      results:
        - member: e2e
          outcome: passed
        - member: example
          outcome: passed
        - member: property
          outcome: passed
        - member: exhaustive
          outcome: passed
        - member: typecheck
          outcome: passed
        - member: arithmetic
          outcome: passed
        - member: smt
          outcome: passed
        - member: rule
          outcome: passed
        - member: state_machine
          outcome: passed
        - member: regex
          outcome: passed
        - member: source
          outcome: passed
    certificate_digest: 83daf1f9a5da35e59c218d0884f3a5c0866153b89e6c2aacd2bb3cf19b9fefda
    claim_bindings:
      - claim_key: CLAIM-D7B715B13C00E1A9
        requirement_id: REQ-kibi-proof-vocabulary
        fact_id: FACT-proof-contract-kinds
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - arithmetic
            - e2e
            - example
            - exhaustive
            - property
            - regex
            - rule
            - smt
            - source
            - state_machine
            - typecheck
---
Proves that a proof contract kind shall be e2e, example, property, exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source, against the code Kibi reads at ingest.