---
title: The missing context tag code shall be context_missing_tag, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-context-missing-tag-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-context-missing-tag-code
  proves:
    - CLAIM-D062BE9E6D27EA1F
origin:
  kind: agent
  recorded_at: '2026-10-28T20:29:51.703Z'
id: TEST-proof-context-missing-tag-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-fa2f58caedd488562bfdc6de
    test_id: TEST-proof-context-missing-tag-code
    scope: unit
    outcome: passed
    code_snapshot: fed4ebb783f2658a2b1a7673268d9b0ffcf80faa0d1f59c186900196eec682cc
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:35:53.149Z'
    finished_at: '2026-10-28T20:35:53.320Z'
    artifact_digest: 49c2ea47842efa5cf82dc7b4ad758f9b25b2580078affe078b3d7c553c195631
    contract_hash: 42b9a974602fadddddb67464bde48681a23f18320e6cb3fa999004894497d5cd
    binding_hash: 9d802f3aa1411924f4c68fbae14254f02f7aad179315947989343dfa70e66318
    fingerprint: 58e0fc4e89d1fc44a2b25d624809d4c80f962ea6c308290171ce3073dcdaf47f
    fingerprint_components:
      contract: 42b9a974602fadddddb67464bde48681a23f18320e6cb3fa999004894497d5cd
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
      - symbol_id: SYM-proof-context-missing-tag-code
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-context-missing-tag-code
      pattern:
        symbol_id: SYM-const-context-missing-tag-code
        type: string
        value: context_missing_tag
    certificate_digest: cb0c1344873f78989365303c74d800867a2b502daf44c37ca54df7ebb224d9f1
    claim_bindings:
      - claim_key: CLAIM-D062BE9E6D27EA1F
        requirement_id: REQ-cli-migration-pin-codes
        fact_id: FACT-context-missing-tag-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: context_missing_tag
---
Proves that the missing context tag code shall be context_missing_tag, against the code Kibi reads at ingest.