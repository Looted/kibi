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
    receipt_id: PR-8003b7a5ed62a44407636a44
    test_id: TEST-proof-canonical-adr-path
    scope: unit
    outcome: passed
    code_snapshot: a7ee6e75591f23c8003fd7cb5df9dc7fcc2863290a587f8517f61d409fca336c
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:37:55.406Z'
    finished_at: '2026-10-28T22:37:55.521Z'
    artifact_digest: 656e1ae121930cbfdea2c51b60026239204209a160afedf88578bf63ea6f6dce
    contract_hash: c05dcde623d1bf10b10a6b666a168e199230171e60f6158dbc1b726bfbc9bb60
    binding_hash: 538fa7eab8152f43e0ba8c28590cc499ac38704e0c908215a10d148cddd6e7d8
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