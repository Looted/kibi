---
title: The schema 6 migration origin reference shall be kibi migrate v5->v6, by a regex proof
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
    - symbol_id: SYM-proof-schema6-migration-origin-ref
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-schema6-migration-origin-ref
  proves:
    - CLAIM-5327F315B5A837CF
origin:
  kind: agent
  recorded_at: '2026-10-28T11:01:15.306Z'
id: TEST-proof-schema6-migration-origin-ref
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-87209d09f96ba36f7626ec0d
    test_id: TEST-proof-schema6-migration-origin-ref
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: af61d7e5e9e2bad81e1dc1a4fa097435c08de1ddecf25b8bcc491bc34fdc244c
    binding_hash: 1e9acbe9540b94c96d30651b26d1f7850daaf877912c5da7a038111a01fd5a38
    fingerprint: 66b891df975ce7b5212909975bef7adda9306ae538b2dfb9efe5e657fa84057c
    fingerprint_components:
      contract: af61d7e5e9e2bad81e1dc1a4fa097435c08de1ddecf25b8bcc491bc34fdc244c
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
      - symbol_id: SYM-proof-schema6-migration-origin-ref
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
      test_id: TEST-proof-schema6-migration-origin-ref
      pattern:
        symbol_id: SYM-const-schema6-migration-origin-ref
        type: string
        value: kibi migrate v5->v6
    certificate_digest: 99d2400cd7bd24bcb28474f706b9668fcca2e43f789d91d7a1f47b22120ed31c
    claim_bindings:
      - claim_key: CLAIM-5327F315B5A837CF
        requirement_id: REQ-kibi-entity-origin-vocabulary
        fact_id: FACT-schema6-migration-origin-ref
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi migrate v5->v6
---
Proves that the schema 6 migration origin reference shall be kibi migrate v5->v6, against the code Kibi reads at ingest.