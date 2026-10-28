---
title: An external vocabulary alignment provider shall run only for kb_model_requirement, by an exhaustive proof
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
    - symbol_id: SYM-proof-external-vocabulary-alignment-operations
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-const-external-vocabulary-alignment-operations
  proves:
    - CLAIM-F71286DA6318994F
origin:
  kind: agent
  recorded_at: '2026-10-28T10:46:27.769Z'
id: TEST-proof-external-vocabulary-alignment-operations
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d3873e3ae53b5e30c65cac0c
    test_id: TEST-proof-external-vocabulary-alignment-operations
    scope: unit
    outcome: passed
    code_snapshot: 21d66c39388dd023f2c152ed795ba97e2485062cdf1073bf4aee8a7a789cbe7a
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T14:51:29.956Z'
    finished_at: '2026-10-28T14:51:30.079Z'
    artifact_digest: 13874cf36ed6b085e95c1bb688b51e0339df6798317a82c99cc29b12a58dca52
    contract_hash: 219a878b69880cd1ef6838c33094b426c272fce1e438aea1a21b668cd12d07cc
    binding_hash: ce3c6057140eeb8b5997824b6f07eef8b10309b9c7d5d69428aea08dbfef214b
    fingerprint: d9b850413fb58439b81464119f373e8bb21ee41323f5ee8fef1492480fb6718e
    fingerprint_components:
      contract: 219a878b69880cd1ef6838c33094b426c272fce1e438aea1a21b668cd12d07cc
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
      - symbol_id: SYM-proof-external-vocabulary-alignment-operations
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
      test_id: TEST-proof-external-vocabulary-alignment-operations
      domain:
        symbol_id: SYM-const-external-vocabulary-alignment-operations
        members:
          - kb_model_requirement
      results:
        - member: kb_model_requirement
          outcome: passed
    certificate_digest: 217ff196db77978ae965319c48a031e27a7c87c5397bf7caf71027da4d8c25cb
    claim_bindings:
      - claim_key: CLAIM-F71286DA6318994F
        requirement_id: REQ-kibi-vocabulary-alignment-settings
        fact_id: FACT-external-vocabulary-alignment-operations
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - kb_model_requirement
---
Proves that an external vocabulary alignment provider shall run only for kb_model_requirement, against the code Kibi reads at ingest.