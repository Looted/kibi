---
title: The entity schema declares exactly eight entity types, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:19:00.083Z'
id: TEST-proof-entity-type-count
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-proof-entity-type-count
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - source:
        reader: json
        file: packages/cli/src/schemas/entity.schema.json
        path: /properties/type/enum
        select: items
      measure: count
  proves:
    - CLAIM-CEF6FA16BAA4B3D3
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e3fec2537e026e94c1d5b030
    test_id: TEST-proof-entity-type-count
    scope: unit
    outcome: passed
    code_snapshot: 71649ed10705e0ff14dfa0f500ef70fff1f548eb2351356f6278688a26e40e5e
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T07:19:40.117Z'
    finished_at: '2026-10-27T07:19:40.297Z'
    artifact_digest: a7e09b67fc716d68d06b2d6d92d8ed0f7acd2449ed9b8bf2480f27c79d1e18d8
    contract_hash: dea87cb10e190cb6b7fe51eb1085dd79d77e3d1526e114ea062cd37d99264e98
    binding_hash: 8f5f0623a7d9bd5032055b3359720f8442968e6daa7e4fe17579bce338949c1d
    fingerprint: 53eb2ef79e677b0253e6f69287dc9516ac3b2c6b7e24da3dcc382008b4b0d187
    fingerprint_components:
      contract: dea87cb10e190cb6b7fe51eb1085dd79d77e3d1526e114ea062cd37d99264e98
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
      - symbol_id: SYM-test-proof-entity-type-count
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-entity-type-count
      variable: entity_type_count
      value_type: int
      assumptions:
        - operator: eq
          value: 8
      claim:
        operator: eq
        value: 8
    certificate_digest: e80dc87d5146ddc47196769d13ac32d0bc63d9a0a07eaf90f461e44b48c9e38e
    claim_bindings:
      - claim_key: CLAIM-CEF6FA16BAA4B3D3
        requirement_id: REQ-004
        fact_id: FACT-ENTITY-TYPES-CORE-7
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 8
          value_type: int
          variable: entity_type_count
---
Proves that the KB schema supports exactly eight entity types: Kibi counts the type enum of the entity schema itself and decides the count claim exactly.