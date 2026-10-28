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
    receipt_id: PR-6cfe8457c7645c171dd38fc7
    test_id: TEST-proof-firmness-types
    scope: unit
    outcome: passed
    code_snapshot: bf6dc28c237eeec059b86c44f4831693a4d73c2fae9e3e3657e51164096248f7
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T14:58:22.479Z'
    finished_at: '2026-10-28T14:58:22.612Z'
    artifact_digest: b3c997c996518dde957bc5d45cfdf1d917e89f6a7818a03616c177762d2047c3
    contract_hash: f1d5adc843f1cd2fc693d3d6204671de6cf59361350d3311c9e213f4155e563c
    binding_hash: 58a89dd223117af013f3c16b8fb3943b58330645b464af278b5ffcbc40651169
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