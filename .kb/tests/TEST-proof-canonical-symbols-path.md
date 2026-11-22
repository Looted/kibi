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
    receipt_id: PR-1d2beeb82a2d8a53cb810f34
    test_id: TEST-proof-canonical-symbols-path
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
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