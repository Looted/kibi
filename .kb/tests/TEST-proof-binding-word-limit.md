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
    receipt_id: PR-ba37736b0970beb984826f27
    test_id: TEST-proof-binding-word-limit
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 64e9817aa3659147aba27706efb4d6ed713cddc7ed2999e94293b1061b82c660
    binding_hash: 2fdee369930e3a4c35248c776c220433bb7b4f932c2b9833036898f5cb1b4899
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
      variable: bound_participant_max_words
      value_type: int
      assumptions:
        - operator: eq
          value: 3
      claim:
        operator: eq
        value: 3
    certificate_digest: a8cd953f1543eb2e7748eb6d4f83405e63b2401cd422b3702c91cbcad7ed6d0e
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
          variable: bound_participant_max_words
---
Proves that the maximum bound participant name length shall be 3 words, against the code Kibi reads at ingest.