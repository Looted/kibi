---
title: The minimum context section length shall be 12 words, by an arithmetic proof
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
    - symbol_id: SYM-proof-min-context-words
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-entity-body-context-min-words
  proves:
    - CLAIM-3AE5FD48C8040C7C
origin:
  kind: agent
  recorded_at: '2026-10-28T10:39:10.369Z'
id: TEST-proof-min-context-words
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c9d34d42b8950a9cc1314b97
    test_id: TEST-proof-min-context-words
    scope: unit
    outcome: passed
    code_snapshot: 6311ff0237c9e52f3017d02926ea2520a1fa6dd28832ee4b7f1ae41a5ca1cb23
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:40:10.813Z'
    finished_at: '2026-10-28T10:40:10.939Z'
    artifact_digest: d6ba6ffcfbc0eb09caa01879c6455c3ab76e5d12b48c6d5f088349aae9d64e6c
    contract_hash: d4ad83a36a2638c9a9de2fa29c11916f8aca55c5bef4081592ab3688341107d3
    binding_hash: 4406062cbc9ad4a6fdbb2ce3dffea181850dda8cc31e63cc59c9ad9647a1858c
    fingerprint: 6552acd34716d5a8659e73fd2b2a914809f59283ac5dffb08d242b7929ac0246
    fingerprint_components:
      contract: d4ad83a36a2638c9a9de2fa29c11916f8aca55c5bef4081592ab3688341107d3
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
      - symbol_id: SYM-proof-min-context-words
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
      test_id: TEST-proof-min-context-words
      variable: min_context_words
      value_type: int
      assumptions:
        - operator: eq
          value: 12
      claim:
        operator: eq
        value: 12
    certificate_digest: c3d65ec8c765ea012d4c55803ec6ca2ea89b081ac82a80e34bfa8849c036ffcf
    claim_bindings:
      - claim_key: CLAIM-3AE5FD48C8040C7C
        requirement_id: REQ-kb-entity-body-context-settings
        fact_id: FACT-min-context-words
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 12
          value_type: int
          variable: min_context_words
---
Proves that the minimum context section length shall be 12 words, against the code Kibi reads at ingest.