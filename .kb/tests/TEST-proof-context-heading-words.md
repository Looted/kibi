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
    receipt_id: PR-3dbd5328a6484148529b9976
    test_id: TEST-proof-context-heading-words
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 314cfc738b1fb5441e06b8802a8fee4897694fd6413f3c1980c0a0f49264f3b6
    binding_hash: 5bb4b63b045ef1d86a73328629eaf5016bb1dbc78fabf768c6c9bdfd1c3cc25f
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