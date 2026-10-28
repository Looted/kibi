---
title: The symbol coordinates format version shall be 2, by an arithmetic proof
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
    - symbol_id: SYM-proof-symbol-coordinates-format-version
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-SYMBOL_COORDINATES_FORMAT_VERSION
  proves:
    - CLAIM-EEBE9761ABA24406
origin:
  kind: agent
  recorded_at: '2026-10-28T11:13:51.025Z'
id: TEST-proof-symbol-coordinates-format-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-0684a0b30f3a604a4ba6e5c7
    test_id: TEST-proof-symbol-coordinates-format-version
    scope: unit
    outcome: passed
    code_snapshot: ac909ff52412d46a423958b88002491f7617fe6f316b2554d008e1895ca6059b
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:15:26.548Z'
    finished_at: '2026-10-28T11:15:26.689Z'
    artifact_digest: cbdeeb100f9a609cf57e0b02f8e05aa5af5c6a2dc400eb3374fddf3c3b840b01
    contract_hash: ac27d7fb5c8d3ea8e3c11d1b73a7d042530db90bd235763be341329014b60be0
    binding_hash: 76a0d384236656607b534b7e9d32cf4111d021f8554b6fc476fc750687799b77
    fingerprint: 8323792b66144bd64bcf632015774d0710ebe4a74f80ac769859a5045d1f62a7
    fingerprint_components:
      contract: ac27d7fb5c8d3ea8e3c11d1b73a7d042530db90bd235763be341329014b60be0
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
      - symbol_id: SYM-proof-symbol-coordinates-format-version
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
      test_id: TEST-proof-symbol-coordinates-format-version
      variable: format_version
      value_type: int
      assumptions:
        - operator: eq
          value: 2
      claim:
        operator: eq
        value: 2
    certificate_digest: 3dacec2e2cee105b80f55e85557c42486e5bc6f481278c1dc05655014b18d2a6
    claim_bindings:
      - claim_key: CLAIM-EEBE9761ABA24406
        requirement_id: REQ-generated-coordinate-settings
        fact_id: FACT-symbol-coordinates-format-version
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 2
          value_type: int
          variable: format_version
---
Proves that the symbol coordinates format version shall be 2, against the code Kibi reads at ingest.