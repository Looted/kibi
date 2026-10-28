---
title: The semantic text pin code shall be semantic_text_pin, by a regex proof
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
    - symbol_id: SYM-proof-semantic-text-pin-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-semantic-text-pin-code
  proves:
    - CLAIM-A8F6A8E66D766038
origin:
  kind: agent
  recorded_at: '2026-10-28T20:30:15.552Z'
id: TEST-proof-semantic-text-pin-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4969e11cbc077a97f9a339b5
    test_id: TEST-proof-semantic-text-pin-code
    scope: unit
    outcome: passed
    code_snapshot: fed4ebb783f2658a2b1a7673268d9b0ffcf80faa0d1f59c186900196eec682cc
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:35:59.354Z'
    finished_at: '2026-10-28T20:35:59.508Z'
    artifact_digest: 5b4f3c27585452eaffcdb5b432aa5277cf34ddb36442d38b771c683a07749574
    contract_hash: 19d25d0d7baf49ec5f827973824a07bdce96a9a61a60089e9e514018ba617674
    binding_hash: 2e982a1c5b431c36a7f23e6360124c3df04600c788c8e069d584a7f3f7cb1b49
    fingerprint: c704c736e09153384caa667e042bf59769977e155fb79d64d428f71203f4cdf1
    fingerprint_components:
      contract: 19d25d0d7baf49ec5f827973824a07bdce96a9a61a60089e9e514018ba617674
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
      - symbol_id: SYM-proof-semantic-text-pin-code
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
      test_id: TEST-proof-semantic-text-pin-code
      pattern:
        symbol_id: SYM-const-semantic-text-pin-code
        type: string
        value: semantic_text_pin
    certificate_digest: 4684bdce41904fddd600d9322d1b9da42d2c4e7da90f8ce478643503efd573ed
    claim_bindings:
      - claim_key: CLAIM-A8F6A8E66D766038
        requirement_id: REQ-cli-migration-pin-codes
        fact_id: FACT-semantic-text-pin-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: semantic_text_pin
---
Proves that the semantic text pin code shall be semantic_text_pin, against the code Kibi reads at ingest.