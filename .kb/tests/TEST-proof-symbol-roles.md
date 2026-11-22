---
title: A symbol role shall be behavioral, structural, type-shape, config, module or unknown, by an exhaustive proof
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-symbol-roles
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-SYMBOL_ROLES
  proves:
    - CLAIM-2563BCC53838A6FC
origin:
  kind: agent
  recorded_at: '2026-10-28T19:09:49.188Z'
id: TEST-proof-symbol-roles
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-bd1d61b640d090254823e1dd
    test_id: TEST-proof-symbol-roles
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: d55087fb223e522e0ae43e4f30e0913d36376d4f46b5d9465768030073784fe6
    binding_hash: 69e9b18c61194fd6418c926bb413ef32337aabc94f986a93a80462a96cb95d81
    fingerprint: 5c9b299a538d9b72411f129dcda9e84099da8c3069476f8a95e3744c12d2be41
    fingerprint_components:
      contract: d55087fb223e522e0ae43e4f30e0913d36376d4f46b5d9465768030073784fe6
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
      - symbol_id: SYM-proof-symbol-roles
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-proof-symbol-roles
      domain:
        symbol_id: SYM-SYMBOL_ROLES
        members:
          - behavioral
          - structural
          - type-shape
          - config
          - module
          - unknown
      results:
        - member: behavioral
          outcome: passed
        - member: structural
          outcome: passed
        - member: type-shape
          outcome: passed
        - member: config
          outcome: passed
        - member: module
          outcome: passed
        - member: unknown
          outcome: passed
    certificate_digest: 7b6749e7244fc8a96cd3ad905295b51765532e4bbf0fa3d706c76ce550073cd8
    claim_bindings:
      - claim_key: CLAIM-2563BCC53838A6FC
        requirement_id: REQ-symbol-granularity-vocabulary
        fact_id: FACT-symbol-roles
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - behavioral
            - config
            - module
            - structural
            - type-shape
            - unknown
---
Proves that a symbol role shall be behavioral, structural, type-shape, config, module or unknown, against the code Kibi reads at ingest.