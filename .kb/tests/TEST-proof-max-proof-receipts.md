---
title: Kibi shall keep at most 50 proof receipts per test, by an arithmetic proof
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
    - symbol_id: SYM-proof-max-proof-receipts
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-max-proof-receipts
  proves:
    - CLAIM-B299410215E2FC50
origin:
  kind: agent
  recorded_at: '2026-10-28T17:50:08.575Z'
id: TEST-proof-max-proof-receipts
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3fde854aede0e37e679c9d7d
    test_id: TEST-proof-max-proof-receipts
    scope: unit
    outcome: passed
    code_snapshot: 0e92ecb6e2415cb6b44cd4648abe5bf8c9c235c18d9f56844e07e29be087804d
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T11:21:23.092Z'
    finished_at: '2026-11-16T11:22:49.884Z'
    artifact_digest: 4c5ff880d8b0e5e45dca5d0803c0c793347804c85ecfaa631ec1e84c2fe84bfa
    contract_hash: 926c1d5cf3c698585d466d7c96c8f5b1447e42d968cd662397aa68044abaaee5
    binding_hash: 85d46516679c3c0e9ae2164810fe420a09b2abaf96393c8cf4f06d9665777ad4
    fingerprint: 69a966f46657664f8b3593d133c770a72bc5ce3a1f8fb68e0b16f00d60378a00
    fingerprint_components:
      contract: 926c1d5cf3c698585d466d7c96c8f5b1447e42d968cd662397aa68044abaaee5
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
      - symbol_id: SYM-proof-max-proof-receipts
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
      test_id: TEST-proof-max-proof-receipts
      variable: max_receipts
      value_type: int
      assumptions:
        - operator: eq
          value: 50
      claim:
        operator: eq
        value: 50
    certificate_digest: 5bfdb890d7f722d3fd64c56e8c1db522248f7df8c173d1b0c3b4ce8a9e973e57
    claim_bindings:
      - claim_key: CLAIM-B299410215E2FC50
        requirement_id: REQ-kibi-proof-retention-limits
        fact_id: FACT-max-proof-receipts
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 50
          value_type: int
          variable: max_receipts
---
Proves that kibi shall keep at most 50 proof receipts per test, against the code Kibi reads at ingest.