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
    receipt_id: PR-3e0627fa4d967a5868025cb5
    test_id: TEST-proof-legacy-kb-migration-command
    scope: unit
    outcome: passed
    code_snapshot: 05a890615d543a9b50938ec38f9103122cb02ef21f1056157bf81a4aeb38181a
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:16:19.856Z'
    finished_at: '2026-10-28T11:16:19.962Z'
    artifact_digest: a4c6ddb52be092a40f25fbebcbbf49056e88bf56c7b39f673380e694113a5327
    contract_hash: 88583c6e4e301315e599085bccc7db808e6716252ccdf085807d82d9bc2ba798
    binding_hash: 1748b0653a5e7a1bf878a1c685356a3200411a436041ed81575769087162c655
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