---
title: Claim-bound proofs shall start at KB schema version 12, by an arithmetic proof
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
    - symbol_id: SYM-proof-claim-binding-schema-version
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-claim-binding-schema-version
  proves:
    - CLAIM-5946ECFCE6EFE677
origin:
  kind: agent
  recorded_at: '2026-10-28T10:58:09.213Z'
id: TEST-proof-claim-binding-schema-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c3d41bc99d1d73a5681a41aa
    test_id: TEST-proof-claim-binding-schema-version
    scope: unit
    outcome: passed
    code_snapshot: 384992ab10a9d5988c607ac168f6a6dfbde65187ee9b60b46cb95fb216aff1eb
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:00:17.921Z'
    finished_at: '2026-10-28T11:00:18.032Z'
    artifact_digest: 6bd9a82271701b060e48c577bb4d120ad2cc31b77522cdff151e38454f06f8d5
    contract_hash: 74e639305b3e405b227ac2301b6ea8cc77c06e10a1c86e84d5788d43dad0c727
    binding_hash: ae73eca584e1a1fb99c3e467d310278bb663d463d85d8769999f65d59a834e23
    fingerprint: 736b4b805c9b34e26cd8dcfb9572534a013b5ae28dcdecaaa6c6075665709d2f
    fingerprint_components:
      contract: 74e639305b3e405b227ac2301b6ea8cc77c06e10a1c86e84d5788d43dad0c727
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
      - symbol_id: SYM-proof-claim-binding-schema-version
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
      test_id: TEST-proof-claim-binding-schema-version
      variable: claim_binding_schema_version
      value_type: int
      assumptions:
        - operator: eq
          value: 12
      claim:
        operator: eq
        value: 12
    certificate_digest: d64af65fbfa0c4e64155b443bf4f80676f190d52ea1b08c2ca3355c3fdcbc6ca
    claim_bindings:
      - claim_key: CLAIM-5946ECFCE6EFE677
        requirement_id: REQ-kibi-claim-bound-proof-settings
        fact_id: FACT-claim-binding-schema-version
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 12
          value_type: int
          variable: claim_binding_schema_version
---
Proves that claim-bound proofs shall start at KB schema version 12, against the code Kibi reads at ingest.