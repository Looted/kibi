---
title: The legacy KB migration command shall be kibi migrate --yes, by a regex proof
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
    - symbol_id: SYM-proof-legacy-kb-migration-command
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-canonical-LEGACY_KB_MIGRATION_COMMAND
  proves:
    - CLAIM-B6CB9B3266E2A0A1
origin:
  kind: agent
  recorded_at: '2026-10-28T11:15:51.436Z'
id: TEST-proof-legacy-kb-migration-command
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d56bafd2d9532b54f7adda98
    test_id: TEST-proof-legacy-kb-migration-command
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 88583c6e4e301315e599085bccc7db808e6716252ccdf085807d82d9bc2ba798
    binding_hash: be407779d5c78865cc062cf7adb02a6b426b8a01faa53feb8fc2376b0c4ca7fb
    fingerprint: 11dbef6e36b60391b7ece2743fd9766e8b8b9a190895a7e67ce8e319d4584bb7
    fingerprint_components:
      contract: 88583c6e4e301315e599085bccc7db808e6716252ccdf085807d82d9bc2ba798
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
      - symbol_id: SYM-proof-legacy-kb-migration-command
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
      test_id: TEST-proof-legacy-kb-migration-command
      pattern:
        symbol_id: SYM-canonical-LEGACY_KB_MIGRATION_COMMAND
        type: string
        value: kibi migrate --yes
    certificate_digest: 175eba95051647e4d3d0a10dd1471ff415f57b71e04fa2ccb357ca0d7a27203b
    claim_bindings:
      - claim_key: CLAIM-B6CB9B3266E2A0A1
        requirement_id: REQ-legacy-kb-migrate-command
        fact_id: FACT-legacy-kb-migration-command
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi migrate --yes
---
Proves that the legacy KB migration command shall be kibi migrate --yes, against the code Kibi reads at ingest.