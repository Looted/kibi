---
title: The entity schema requires exactly the record fields, by a source proof
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:19:12.046Z'
id: TEST-proof-entity-required-fields
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-proof-entity-required-fields
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/cli/src/schemas/entity.schema.json
    path: /required
    select: items
  proves:
    - CLAIM-B65B400C4EE4B605
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d44edff395b6f63d4528cc3f
    test_id: TEST-proof-entity-required-fields
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: ec55a9b789ded191340298fe0c4a5f4fb76e3b239cc6e3610590e7984f1db2ad
    binding_hash: 04d75a6367c126900f028f07a9cc34ac9351ff371b7f083775de721e187ed0b4
    fingerprint: bd9c7ffe8ea47f3ea942ae7bd0dfa612b44971b183ef04fee534598479b1809e
    fingerprint_components:
      contract: ec55a9b789ded191340298fe0c4a5f4fb76e3b239cc6e3610590e7984f1db2ad
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
      - symbol_id: SYM-test-proof-entity-required-fields
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
      test_id: TEST-proof-entity-required-fields
      source:
        reader: json
        file: packages/cli/src/schemas/entity.schema.json
        path: /required
        select: items
      model:
        members:
          - created_at
          - id
          - source
          - status
          - title
          - type
          - updated_at
        sequence:
          - id
          - title
          - status
          - created_at
          - updated_at
          - source
          - type
    certificate_digest: ff71702a671bf4183793a89c30dcd5be5b34ee62abe5586dfff6072caad8c1cc
    claim_bindings:
      - claim_key: CLAIM-B65B400C4EE4B605
        requirement_id: REQ-004
        fact_id: FACT-entity-record-required-fields
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - created_at
            - id
            - source
            - status
            - title
            - type
            - updated_at
          operator: eq
---
Proves that every entity record requires id, type, title, status, created_at, updated_at and source: Kibi reads the required list of the entity schema itself.