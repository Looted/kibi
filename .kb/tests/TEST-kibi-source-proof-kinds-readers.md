---
title: Source proof readers are exactly the schema's reader enum, by a source proof
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
    - symbol_id: SYM-test-source-proof-kinds-readers
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/cli/src/schemas/entity.schema.json
    path: /properties/proof_contract/properties/source/properties/reader/enum
    select: items
  proves:
    - CLAIM-D1436E2B6F2C67DE
origin:
  kind: agent
  recorded_at: '2026-10-26T17:38:49.831Z'
id: TEST-kibi-source-proof-kinds-readers
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-03bb57c6626b1833a4483a29
    test_id: TEST-kibi-source-proof-kinds-readers
    scope: unit
    outcome: passed
    code_snapshot: 33f4c964367981482cdc65c02bbc95e9062a11d74fdd6e243de943b060589077
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-31T10:31:45.773Z'
    finished_at: '2026-10-31T10:31:45.895Z'
    artifact_digest: 91698eacb6d5d9bb42680e8519d8f648d11f5ddecda35a6cdab4e196e4c8583e
    contract_hash: 4785ca83149ec4de0f00656ab063627b24edee06d2cb494b5509dd72467bfe8f
    binding_hash: 9e626bab8fc952cc18b37e0223e76d4a7704fc03aeb6ab7a45c04fc05f30f22b
    fingerprint: 9e3e0d1e5f4277a142a21644b244ab04b7e39ab7c7b4ea72c9791ee115db99b0
    fingerprint_components:
      contract: 4785ca83149ec4de0f00656ab063627b24edee06d2cb494b5509dd72467bfe8f
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
      - symbol_id: SYM-test-source-proof-kinds-readers
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
      test_id: TEST-kibi-source-proof-kinds-readers
      source:
        reader: json
        file: packages/cli/src/schemas/entity.schema.json
        path: /properties/proof_contract/properties/source/properties/reader/enum
        select: items
      model:
        members:
          - glob
          - json
          - openapi
          - prolog
          - references
          - routes
          - schema
          - validator
          - yaml
        sequence:
          - json
          - yaml
          - glob
          - openapi
          - references
          - schema
          - routes
          - validator
          - prolog
    certificate_digest: d5b2ee916b0ab6a69b8224f652d12279f6053d43998e65ff1443bacc1967d5f8
    claim_bindings:
      - claim_key: CLAIM-D1436E2B6F2C67DE
        requirement_id: REQ-kibi-source-proof-reader-vocabulary
        fact_id: FACT-kibi-source-proof-readers
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - glob
            - json
            - openapi
            - prolog
            - references
            - routes
            - schema
            - validator
            - yaml
          operator: eq
---
Kibi reads the reader enum the entity schema publishes for source proof contracts and checks it against the set fact naming the eight source readers; the test only leaves a source certificate for the run.