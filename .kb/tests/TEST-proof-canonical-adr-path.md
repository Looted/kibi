---
title: The canonical adr path shall be .kb/adr, by a regex proof
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
    - symbol_id: SYM-proof-canonical-adr-path
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-canonical-CANONICAL_ENTITY_PATHS
    export: CANONICAL_ENTITY_PATHS.adr
  proves:
    - CLAIM-12E7D2D9935076B8
origin:
  kind: agent
  recorded_at: '2026-10-28T22:35:05.770Z'
id: TEST-proof-canonical-adr-path
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e7a718546f7572170159d706
    test_id: TEST-proof-canonical-adr-path
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: c05dcde623d1bf10b10a6b666a168e199230171e60f6158dbc1b726bfbc9bb60
    binding_hash: ff464d596d69a62e88e7e56987dadd602426dfcaf6ffb912e6466c1871bd9ce6
    fingerprint: e962e07bd9be64c72ae5eafe0731e0a10c080e633cedf0c3a8c4e223083aa7d8
    fingerprint_components:
      contract: c05dcde623d1bf10b10a6b666a168e199230171e60f6158dbc1b726bfbc9bb60
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
      - symbol_id: SYM-proof-canonical-adr-path
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
      test_id: TEST-proof-canonical-adr-path
      pattern:
        symbol_id: SYM-canonical-CANONICAL_ENTITY_PATHS
        type: string
        value: .kb/adr
    certificate_digest: 411079c5c6504678d7e57002a099a5a4b6a283b3b5a46c91af1b7fd9e94c88df
    claim_bindings:
      - claim_key: CLAIM-12E7D2D9935076B8
        requirement_id: REQ-cli-kb-entity-paths
        fact_id: FACT-canonical-adr-path
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: .kb/adr
---
Proves that the canonical adr path shall be .kb/adr, against the code Kibi reads at ingest.