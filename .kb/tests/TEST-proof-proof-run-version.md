---
title: The proof run version shall be kibi.proof-run.v1, by a regex proof
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
    - symbol_id: SYM-proof-proof-run-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-proof-run-version
  proves:
    - CLAIM-BC55CA4697B8540B
origin:
  kind: agent
  recorded_at: '2026-10-28T10:54:49.228Z'
id: TEST-proof-proof-run-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-76341c3636839bf19530d2d2
    test_id: TEST-proof-proof-run-version
    scope: unit
    outcome: passed
    code_snapshot: 00789ad267505753ad3bd92ec08fa414afd96e416d456489296135f6623c9e09
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T12:06:32.039Z'
    finished_at: '2026-10-28T12:06:32.149Z'
    artifact_digest: 6a340cf5576edc4b0366d6863a4c6dd5a72609d52c7b910f96657842449a1ffb
    contract_hash: c1e675af355feb87f904dae15b1efd6238ca009ff4cf032a59cc60f2dff4c655
    binding_hash: f587e24181ab481d54efbf0af343e76dca75552a7d70d4f55856992394038ced
    fingerprint: 5a990ddb4e5a7589f4a4f8054eccede6636c9dd82dc25e72c366be8cb9854e7d
    fingerprint_components:
      contract: c1e675af355feb87f904dae15b1efd6238ca009ff4cf032a59cc60f2dff4c655
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
      - symbol_id: SYM-proof-proof-run-version
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
      test_id: TEST-proof-proof-run-version
      pattern:
        symbol_id: SYM-proof-run-version
        type: string
        value: kibi.proof-run.v1
    certificate_digest: d7c9b9b250c53d5ca4165434892ce5342a37d946d490e5e91b525fc90747eebf
    claim_bindings:
      - claim_key: CLAIM-BC55CA4697B8540B
        requirement_id: REQ-kibi-proof-protocol-versions
        fact_id: FACT-proof-run-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.proof-run.v1
---
Proves that the proof run version shall be kibi.proof-run.v1, against the code Kibi reads at ingest.