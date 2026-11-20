---
title: The canonical symbols path shall be .kb/symbols.yaml, by a regex proof
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
    - symbol_id: SYM-proof-canonical-symbols-path
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-canonical-CANONICAL_ENTITY_PATHS
    export: CANONICAL_ENTITY_PATHS.symbols
  proves:
    - CLAIM-E1C731AC3734E4DE
origin:
  kind: agent
  recorded_at: '2026-10-28T22:36:09.389Z'
id: TEST-proof-canonical-symbols-path
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c812ec619dd8cf786cf32c94
    test_id: TEST-proof-canonical-symbols-path
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: a14e28845d2f2c88df8c4a969e1fbc07551e65f6c7ea1ddd8b0e8ced7ebcce79
    binding_hash: 5cb36c1d096907188b2ba3343d8326cc8caf4e7bdd813793e492b9c8c4950b5e
    fingerprint: edd8453236cad00bd5bf8ce31f322d0009a905105f6b4489bcd8e380970dc31d
    fingerprint_components:
      contract: a14e28845d2f2c88df8c4a969e1fbc07551e65f6c7ea1ddd8b0e8ced7ebcce79
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
      - symbol_id: SYM-proof-canonical-symbols-path
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
      test_id: TEST-proof-canonical-symbols-path
      pattern:
        symbol_id: SYM-canonical-CANONICAL_ENTITY_PATHS
        type: string
        value: .kb/symbols.yaml
    certificate_digest: 6f0b48a516f971bb9608c802bd83f054cd5b2898f1ee209b09e00c866212e287
    claim_bindings:
      - claim_key: CLAIM-E1C731AC3734E4DE
        requirement_id: REQ-cli-kb-entity-paths
        fact_id: FACT-canonical-symbols-path
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: .kb/symbols.yaml
---
Proves that the canonical symbols path shall be .kb/symbols.yaml, against the code Kibi reads at ingest.