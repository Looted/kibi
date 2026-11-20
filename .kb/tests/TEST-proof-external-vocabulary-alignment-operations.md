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
    receipt_id: PR-d0742f8b07344f2bb1a00e16
    test_id: TEST-proof-external-vocabulary-alignment-operations
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 219a878b69880cd1ef6838c33094b426c272fce1e438aea1a21b668cd12d07cc
    binding_hash: ca62a6dbfdf4239f857d005102736b3f7fdd67924db7e7f2309d76cf4f559d9b
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