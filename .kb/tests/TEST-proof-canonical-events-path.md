---
title: The canonical events path shall be .kb/events, by a regex proof
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
    - symbol_id: SYM-proof-canonical-events-path
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-canonical-CANONICAL_ENTITY_PATHS
    export: CANONICAL_ENTITY_PATHS.events
  proves:
    - CLAIM-19C78FD7561E9C07
origin:
  kind: agent
  recorded_at: '2026-10-28T22:35:37.889Z'
id: TEST-proof-canonical-events-path
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-8b220ff5cbe79e46d5df8f60
    test_id: TEST-proof-canonical-events-path
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: bbbd52cbb6d8a10129cffa2311e1c6290dde34b4f19a821a24c8c79da5c916fd
    binding_hash: 6650b9b7b21c8ad7195c6d5b80244790719084e35909e18c44ac0681af58ef76
    fingerprint: acfd6528c13bb9a66c3c41a2ad7e0ffa744ee8e65717208012aa49078d08aa42
    fingerprint_components:
      contract: bbbd52cbb6d8a10129cffa2311e1c6290dde34b4f19a821a24c8c79da5c916fd
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
      - symbol_id: SYM-proof-canonical-events-path
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
      test_id: TEST-proof-canonical-events-path
      pattern:
        symbol_id: SYM-canonical-CANONICAL_ENTITY_PATHS
        type: string
        value: .kb/events
    certificate_digest: bae7e3f66966e4b36824ccdda6a9cc822199aa43d4c9cca1aee0be86795af068
    claim_bindings:
      - claim_key: CLAIM-19C78FD7561E9C07
        requirement_id: REQ-cli-kb-entity-paths
        fact_id: FACT-canonical-events-path
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: .kb/events
---
Proves that the canonical events path shall be .kb/events, against the code Kibi reads at ingest.