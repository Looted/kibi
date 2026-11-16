---
title: The non-behavioral symbol roles shall be structural, type-shape, config and module, by a source proof
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-non-behavioral-symbol-roles
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: prolog
    file: packages/core/src/symbol_classification.pl
    functor: non_behavioral_role/1
  proves:
    - CLAIM-42CC2399770CE6B0
origin:
  kind: agent
  recorded_at: '2026-11-16T11:03:55.302Z'
id: TEST-proof-non-behavioral-symbol-roles
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-5cfdbfd2e0392494c79a2dd5
    test_id: TEST-proof-non-behavioral-symbol-roles
    scope: unit
    outcome: passed
    code_snapshot: 5434da306c269b06f3ab3332686aeca47fd3a0e8a998befaf06388d5c53900c8
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T12:16:43.780Z'
    finished_at: '2026-11-16T12:18:17.305Z'
    artifact_digest: 18bc221c84bfdef0fd1b2db61bbc5f731cb456e0414e714a9ab13a65d1fd8b0f
    contract_hash: 5e4eae3da6d84b405e70fa0ba75b8273f07507a2b988c0530a262583716da10f
    binding_hash: 483994c11c8d3a6754c4ed7a3f5d1a598d6bad3618a86e52688a5919d0589c41
    fingerprint: 92698ff2c4a0ee6aac3e5cdb307b0539f709127e42abf94c598e4e4a63303be9
    fingerprint_components:
      contract: 5e4eae3da6d84b405e70fa0ba75b8273f07507a2b988c0530a262583716da10f
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
      - symbol_id: SYM-proof-non-behavioral-symbol-roles
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: source
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: source
      test_id: TEST-proof-non-behavioral-symbol-roles
      source:
        reader: prolog
        file: packages/core/src/symbol_classification.pl
        functor: non_behavioral_role/1
      model:
        members:
          - config
          - module
          - structural
          - type-shape
        sequence:
          - structural
          - type-shape
          - config
          - module
    certificate_digest: 5c14a37a61327e747a1a0d450ccc2bc7a7d6ee86483b64932744970a1d7175a0
    claim_bindings:
      - claim_key: CLAIM-42CC2399770CE6B0
        requirement_id: REQ-symbol-traceability-behavioral-only
        fact_id: FACT-non-behavioral-symbol-roles
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - config
            - module
            - structural
            - type-shape
          operator: eq
---
Proves that the non-behavioral symbol roles shall be structural, type-shape, config and module, reading the non_behavioral_role/1 facts Kibi's checks load.