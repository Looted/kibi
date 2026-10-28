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
    receipt_id: PR-7aed094d488149bf4b75fc11
    test_id: TEST-proof-canonical-events-path
    scope: unit
    outcome: passed
    code_snapshot: a7ee6e75591f23c8003fd7cb5df9dc7fcc2863290a587f8517f61d409fca336c
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:38:05.610Z'
    finished_at: '2026-10-28T22:38:05.698Z'
    artifact_digest: d6dada6df7b58fb542499bcaeb03d7deb9bd67accae2668975fbe59f1a3a9de1
    contract_hash: bbbd52cbb6d8a10129cffa2311e1c6290dde34b4f19a821a24c8c79da5c916fd
    binding_hash: fb3fbcdc692a5ec36991a0e0210a3de6667ab45dcc3250763ee4a68b07f68239
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