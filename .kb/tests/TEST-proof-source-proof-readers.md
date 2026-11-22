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
    receipt_id: PR-e22786068395f45355aec7cd
    test_id: TEST-proof-source-proof-readers
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 5b83236277d9914be2417d3d3729cbef0632026318b5a4c0629b296e21854c8c
    binding_hash: 8c0ba9de020a930ac05bf2c0b0d13692e717246f9abb7fc92d3547dce3643c01
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