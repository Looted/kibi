---
title: The maximum proof receipt age shall be 604800 seconds, by an arithmetic proof
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
    - symbol_id: SYM-proof-proof-receipt-max-age
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-proof-receipt-max-age-seconds
  proves:
    - CLAIM-B7AF26BF0F918815
origin:
  kind: agent
  recorded_at: '2026-10-28T10:12:20.489Z'
id: TEST-proof-proof-receipt-max-age
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e727f8ed609a7bf7937c6f3a
    test_id: TEST-proof-proof-receipt-max-age
    scope: unit
    outcome: passed
    code_snapshot: fdb95969e455d32c1e775fe206b8a2e3a32a98eac2f124ccdd6228a04a7fb5f4
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:13:55.938Z'
    finished_at: '2026-10-28T10:13:56.053Z'
    artifact_digest: 933d74d72a386d9034a2b3a5f30fec6c18393de34ee591c963cf1e46aa21aa58
    contract_hash: a366d0da4e92faf11d5023d954aff5bd81c6fbc80e1704c67b07f58bd11d1a00
    binding_hash: 26cd44fda8f72d607988dc0ec30259a63ff23f1e2fa7f35e929a92960c6682ab
    fingerprint: 11ceac338fae894356b29798d30f9de08934292ed67014ac3c0c122f95587c61
    fingerprint_components:
      contract: a366d0da4e92faf11d5023d954aff5bd81c6fbc80e1704c67b07f58bd11d1a00
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
      - symbol_id: SYM-proof-proof-receipt-max-age
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
      test_id: TEST-proof-proof-receipt-max-age
      variable: max_receipt_age_seconds
      value_type: int
      assumptions:
        - operator: eq
          value: 604800
      claim:
        operator: eq
        value: 604800
    certificate_digest: 239af94d7b92c11d81275d6752fefa46226fd0f25f4354c779817fb54aac9954
    claim_bindings:
      - claim_key: CLAIM-B7AF26BF0F918815
        requirement_id: REQ-kibi-proof-receipt-max-age
        fact_id: FACT-proof-receipt-max-age
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 604800
          value_type: int
          variable: max_receipt_age_seconds
---
Proves that the maximum proof receipt age shall be 604800 seconds, against the code Kibi reads at ingest.