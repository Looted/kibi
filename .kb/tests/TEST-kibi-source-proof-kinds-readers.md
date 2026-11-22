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
    receipt_id: PR-c7a5fcbca983bf3d46721ce6
    test_id: TEST-kibi-source-proof-kinds-readers
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 4785ca83149ec4de0f00656ab063627b24edee06d2cb494b5509dd72467bfe8f
    binding_hash: c524fbbdc802f099b8fa7dcfcf9082918daa6c0c66bf7d96d43075644e63de8a
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