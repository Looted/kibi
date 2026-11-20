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
    receipt_id: PR-d1bb6a22ca15ae1fc512f56f
    test_id: TEST-proof-semantic-text-pin-code
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 19d25d0d7baf49ec5f827973824a07bdce96a9a61a60089e9e514018ba617674
    binding_hash: b559f7a4153d10e7b904554d96f988caa58f9b0b1f6b36ac302fc0d3d94c81b2
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
        requirement_id: REQ-cli-migration-context-codes
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