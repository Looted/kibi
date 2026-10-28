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
    receipt_id: PR-ad40083f506489f855e3bf3b
    test_id: TEST-proof-schema6-migration-origin-ref
    scope: unit
    outcome: passed
    code_snapshot: 3fc412bb59139c2d3e14abfb073b0c0c51d8325614126c3ecb530445537bd05b
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:02:13.801Z'
    finished_at: '2026-10-28T11:02:13.920Z'
    artifact_digest: b52fd291dea17fd0c1d56eccaa6a827edc519ecaa7475abe48d7198dbf61f54c
    contract_hash: af61d7e5e9e2bad81e1dc1a4fa097435c08de1ddecf25b8bcc491bc34fdc244c
    binding_hash: ed7d62843efbefe9fb6be00b3a47b00e040c3f8fe9e0856a7706d9ed5bd1c6fa
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