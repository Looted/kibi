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
    receipt_id: PR-965923cc4e6699dd2b8e6668
    test_id: TEST-proof-schema6-migration-origin-ref
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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