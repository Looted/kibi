---
title: The predicate key arguments review code shall be review_predicate_key_arguments, by a regex proof
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
    - symbol_id: SYM-proof-predicate-key-review-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-check-actions-PREDICATE_KEY_ARGUMENTS_REVIEW_CODE
  proves:
    - CLAIM-99283E7F3C085DEB
origin:
  kind: agent
  recorded_at: '2026-10-28T20:27:25.845Z'
id: TEST-proof-predicate-key-review-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-da77f3e98e299179a89a58a6
    test_id: TEST-proof-predicate-key-review-code
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: ce8c18fa143c797d8792c351e381e73a2fd18d4c68b597b9b2a13a41a2edb452
    binding_hash: c79066bc7b3d50b1b144a44e6aa384abee06d9d42921e615cc213f2a27e4d070
    fingerprint: e38a3b30ca26b800b208843593c778f6d8be5caff80e69c7b0bd69f4c89b284d
    fingerprint_components:
      contract: ce8c18fa143c797d8792c351e381e73a2fd18d4c68b597b9b2a13a41a2edb452
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
      - symbol_id: SYM-proof-predicate-key-review-code
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
      test_id: TEST-proof-predicate-key-review-code
      pattern:
        symbol_id: SYM-schema6-check-actions-PREDICATE_KEY_ARGUMENTS_REVIEW_CODE
        type: string
        value: review_predicate_key_arguments
    certificate_digest: 113e83da91b36e9435dc59e6f61c2680479e24eee1a25a9dc287d7205414399c
    claim_bindings:
      - claim_key: CLAIM-99283E7F3C085DEB
        requirement_id: REQ-kibi-lifecycle-review-actions
        fact_id: FACT-predicate-key-review-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: review_predicate_key_arguments
---
Proves that the predicate key arguments review code shall be review_predicate_key_arguments, against the code Kibi reads at ingest.