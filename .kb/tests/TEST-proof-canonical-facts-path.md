---
title: The canonical facts path shall be .kb/facts, by a regex proof
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
    - symbol_id: SYM-proof-canonical-facts-path
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-canonical-CANONICAL_ENTITY_PATHS
    export: CANONICAL_ENTITY_PATHS.facts
  proves:
    - CLAIM-39F74AD8BD77527F
origin:
  kind: agent
  recorded_at: '2026-10-28T22:35:54.001Z'
id: TEST-proof-canonical-facts-path
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-216ec355d8a7206e8cb270d5
    test_id: TEST-proof-canonical-facts-path
    scope: unit
    outcome: passed
    code_snapshot: a7ee6e75591f23c8003fd7cb5df9dc7fcc2863290a587f8517f61d409fca336c
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:38:10.560Z'
    finished_at: '2026-10-28T22:38:10.648Z'
    artifact_digest: 6e5578316e8a16700d2ab13e9eeecbee7845381bc7ed632d21a8cf64d19e3b4a
    contract_hash: 5a42bc4a55d45881fd51c61592ea807b7058b3b4f5820ff06946ce6479e1706d
    binding_hash: 9f959ba3b22518331668d3acfb8186ebc7be42385afdf701f64cddf07c91980a
    fingerprint: fa0f4fde54ca6fd23a7fbfa508f430aa6dc9de6ecb8915460e753b4e6d70746e
    fingerprint_components:
      contract: 5a42bc4a55d45881fd51c61592ea807b7058b3b4f5820ff06946ce6479e1706d
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
      - symbol_id: SYM-proof-canonical-facts-path
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
      test_id: TEST-proof-canonical-facts-path
      pattern:
        symbol_id: SYM-canonical-CANONICAL_ENTITY_PATHS
        type: string
        value: .kb/facts
    certificate_digest: 1342b4d3aced4783742c477ba6974a5283f060a7d97ed356e19098a8f2346d79
    claim_bindings:
      - claim_key: CLAIM-39F74AD8BD77527F
        requirement_id: REQ-cli-kb-entity-paths
        fact_id: FACT-canonical-facts-path
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: .kb/facts
---
Proves that the canonical facts path shall be .kb/facts, against the code Kibi reads at ingest.