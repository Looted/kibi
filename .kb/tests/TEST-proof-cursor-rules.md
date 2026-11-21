---
title: 'Source proof: kibi-cursor ships the Kibi rules'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:53:02.288Z'
id: TEST-proof-cursor-rules
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-cursor-rules
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: glob
    pattern: packages/cursor/rules/*.mdc
    capture: true
  proves:
    - CLAIM-9B17D222A1E9E7D9
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1c8d298d1ffd3c60e9f06505
    test_id: TEST-proof-cursor-rules
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: f34370eeed7c36cf277f6317d7f4b02d6e1ae1657ff5e92854458ddd5c636a43
    binding_hash: 4e00506866bce67d3df7e2b26fa97f7983a64a65d732aef397fd9cfd6c95cddf
    fingerprint: 14c0a0171fdd82062b0290b5dda23aa30cceddfafb6c78d6d84f9a409ed4090a
    fingerprint_components:
      contract: f34370eeed7c36cf277f6317d7f4b02d6e1ae1657ff5e92854458ddd5c636a43
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
      - symbol_id: SYM-proof-cursor-rules
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: source
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: source
      test_id: TEST-proof-cursor-rules
      source:
        reader: glob
        pattern: packages/cursor/rules/*.mdc
        capture: true
      model:
        members:
          - kibi-traceability
          - kibi-workflow
    certificate_digest: e2bcdfbaebb01aff29afa2ae41f13a4e4d9a82673c632b2d40fb59a3f4c80aca
    claim_bindings:
      - claim_key: CLAIM-9B17D222A1E9E7D9
        requirement_id: REQ-cursor-plugin-package
        fact_id: FACT-cursor-bundled-rules
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - kibi-traceability
            - kibi-workflow
          operator: includes
---
Globs packages/cursor/rules/*.mdc. Kibi re-reads the same file when it ingests the certificate, so the claim stays proved only while the file still matches.
