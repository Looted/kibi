---
title: The entity types that carry firmness shall be req and adr, by an exhaustive proof
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
    - symbol_id: SYM-proof-firmness-types
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-decision-firmness-types
  proves:
    - CLAIM-1ACE983F105BF0F1
origin:
  kind: agent
  recorded_at: '2026-10-28T10:33:20.077Z'
id: TEST-proof-firmness-types
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1533041a742647c586ab32d9
    test_id: TEST-proof-firmness-types
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: f1d5adc843f1cd2fc693d3d6204671de6cf59361350d3311c9e213f4155e563c
    binding_hash: d94ed2679148b00fb51e393891d74a34be752367822eb67aefde4be37cc5d744
    fingerprint: e42b51ef20d66a8ae97a818a32f37b85464e931f5219850c1a9505fa997d4ef0
    fingerprint_components:
      contract: f1d5adc843f1cd2fc693d3d6204671de6cf59361350d3311c9e213f4155e563c
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
      - symbol_id: SYM-proof-firmness-types
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
      test_id: TEST-proof-firmness-types
      domain:
        symbol_id: SYM-decision-firmness-types
        members:
          - req
          - adr
      results:
        - member: req
          outcome: passed
        - member: adr
          outcome: passed
    certificate_digest: 0dd2f87cd3ce26b04eb5dafa9874f7fdc5737d37d66f166ac805ef2a83b0346f
    claim_bindings:
      - claim_key: CLAIM-1ACE983F105BF0F1
        requirement_id: REQ-kb-decision-firmness-settings
        fact_id: FACT-firmness-types
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - adr
            - req
---
Proves that the entity types that carry firmness shall be req and adr, against the code Kibi reads at ingest.