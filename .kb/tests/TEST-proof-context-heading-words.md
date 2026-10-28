---
title: The context section headings shall be context, rationale, why, background, source, notes and evidence, by an exhaustive proof
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
    - symbol_id: SYM-proof-context-heading-words
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-entity-body-context-heading-words
  proves:
    - CLAIM-07E2F041C92FF4E3
origin:
  kind: agent
  recorded_at: '2026-10-28T10:38:45.889Z'
id: TEST-proof-context-heading-words
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4d574bbd2ae24e804bda259e
    test_id: TEST-proof-context-heading-words
    scope: unit
    outcome: passed
    code_snapshot: 6311ff0237c9e52f3017d02926ea2520a1fa6dd28832ee4b7f1ae41a5ca1cb23
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:40:04.678Z'
    finished_at: '2026-10-28T10:40:04.788Z'
    artifact_digest: fb8f48e1e97f708074716bd3d2473502aadaa46f7d3bcc80403dfd1f53a3f632
    contract_hash: 314cfc738b1fb5441e06b8802a8fee4897694fd6413f3c1980c0a0f49264f3b6
    binding_hash: 15a7bb4e8b300a315e784aa8c9c0d3e20c57461fccab5ffc5658a2a25dca0ad8
    fingerprint: b9068e46a4af7a8cb4e6056f819b263178d9174e430c13463d7a6f6f355a2872
    fingerprint_components:
      contract: 314cfc738b1fb5441e06b8802a8fee4897694fd6413f3c1980c0a0f49264f3b6
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
      - symbol_id: SYM-proof-context-heading-words
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
      test_id: TEST-proof-context-heading-words
      domain:
        symbol_id: SYM-entity-body-context-heading-words
        members:
          - context
          - rationale
          - why
          - background
          - source
          - notes
          - evidence
      results:
        - member: context
          outcome: passed
        - member: rationale
          outcome: passed
        - member: why
          outcome: passed
        - member: background
          outcome: passed
        - member: source
          outcome: passed
        - member: notes
          outcome: passed
        - member: evidence
          outcome: passed
    certificate_digest: e8476eb247331ccaf88a2c55f6b92b36b3076937e25726b7137440ce8d8e49a6
    claim_bindings:
      - claim_key: CLAIM-07E2F041C92FF4E3
        requirement_id: REQ-kb-entity-body-context-settings
        fact_id: FACT-context-heading-words
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - background
            - context
            - evidence
            - notes
            - rationale
            - source
            - why
---
Proves that the context section headings shall be context, rationale, why, background, source, notes and evidence, against the code Kibi reads at ingest.