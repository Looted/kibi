---
title: The maximum bound participant name length shall be 3 words, by an arithmetic proof
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
    - symbol_id: SYM-proof-binding-word-limit
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-predicate-bindings-max-naming-binding-words
  proves:
    - CLAIM-0177F086CAF82496
origin:
  kind: agent
  recorded_at: '2026-10-28T10:14:24.082Z'
id: TEST-proof-binding-word-limit
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f0d21b750500529ce9f41e58
    test_id: TEST-proof-binding-word-limit
    scope: unit
    outcome: passed
    code_snapshot: c4d9d166a9ab4e76d943d7d63ccf7c0b34eaa49fd1054dbfd9d0a4a29aa9998f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:14:45.745Z'
    finished_at: '2026-10-28T10:14:45.891Z'
    artifact_digest: e03369afe1053599007ce4faaa4982f45c86964bc84f07c9318ec154e89f0266
    contract_hash: 64e9817aa3659147aba27706efb4d6ed713cddc7ed2999e94293b1061b82c660
    binding_hash: baa1824ad9ea83c9891eef26aa56a10b313022c80f01d279dbd3775359a2e42a
    fingerprint: 7aebf7c8bf9264610c76c6475b3760e7b0c5d28fd6bb10edd45dbbce9592e090
    fingerprint_components:
      contract: 64e9817aa3659147aba27706efb4d6ed713cddc7ed2999e94293b1061b82c660
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
      - symbol_id: SYM-proof-binding-word-limit
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
      test_id: TEST-proof-binding-word-limit
      variable: max_naming_binding_words
      value_type: int
      assumptions:
        - operator: eq
          value: 3
      claim:
        operator: eq
        value: 3
    certificate_digest: e7fe4054ea128b013e69c8babefe1d34f2cb3b52e725bcbf7277401527beb8f8
    claim_bindings:
      - claim_key: CLAIM-0177F086CAF82496
        requirement_id: REQ-model-predicates-binding-word-limit
        fact_id: FACT-binding-word-limit
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 3
          value_type: int
          variable: max_naming_binding_words
---
Proves that the maximum bound participant name length shall be 3 words, against the code Kibi reads at ingest.