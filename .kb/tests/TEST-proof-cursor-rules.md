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
    receipt_id: PR-88c128145d374c0b779b7272
    test_id: TEST-proof-cursor-rules
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
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
