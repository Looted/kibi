---
title: A source proof reader shall be json, yaml, glob, openapi, references, schema, routes, validator or prolog, by an exhaustive proof
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
    - symbol_id: SYM-proof-source-proof-readers
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-const-source-readers
  proves:
    - CLAIM-2337B1E3178A6C90
origin:
  kind: agent
  recorded_at: '2026-10-29T16:46:17.071Z'
id: TEST-proof-source-proof-readers
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-73dbf5afa9b636d31aece8b0
    test_id: TEST-proof-source-proof-readers
    scope: unit
    outcome: passed
    code_snapshot: 33f4c964367981482cdc65c02bbc95e9062a11d74fdd6e243de943b060589077
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-31T10:31:48.078Z'
    finished_at: '2026-10-31T10:31:48.186Z'
    artifact_digest: a78e08d3085f6469ae9a429d0780eedd53161ae879e23a5e6b9b3c14ee5cc3b5
    contract_hash: 5b83236277d9914be2417d3d3729cbef0632026318b5a4c0629b296e21854c8c
    binding_hash: 187c516780f620f4aec1b5b524ec6326a1bf3518b698ce26685bd0ef95cc92b2
    fingerprint: 92927a51054382acd5172df926d488fb9944c4211a17e0aa6b20fc58869305b8
    fingerprint_components:
      contract: 5b83236277d9914be2417d3d3729cbef0632026318b5a4c0629b296e21854c8c
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
      - symbol_id: SYM-proof-source-proof-readers
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
      test_id: TEST-proof-source-proof-readers
      domain:
        symbol_id: SYM-const-source-readers
        members:
          - json
          - yaml
          - glob
          - openapi
          - references
          - schema
          - routes
          - validator
          - prolog
      results:
        - member: json
          outcome: passed
        - member: yaml
          outcome: passed
        - member: glob
          outcome: passed
        - member: openapi
          outcome: passed
        - member: references
          outcome: passed
        - member: schema
          outcome: passed
        - member: routes
          outcome: passed
        - member: validator
          outcome: passed
        - member: prolog
          outcome: passed
    certificate_digest: 14d1aa07ea893e81e4960db0c339bef3b699195581c572dacb49d4559f354cf0
    claim_bindings:
      - claim_key: CLAIM-2337B1E3178A6C90
        requirement_id: REQ-kibi-proof-vocabulary
        fact_id: FACT-source-proof-readers
        binding: derived
        scope: code
        obligation:
          kind: set_equals
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
---
Proves that a source proof reader shall be json, yaml, glob, openapi, references, schema, routes or validator, against the code Kibi reads at ingest.