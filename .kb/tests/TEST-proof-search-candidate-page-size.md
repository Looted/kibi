---
title: A search candidate page shall hold at most 500 candidates, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-search-candidate-page-size
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-cli-discovery-search-candidate-page-size
  proves:
    - CLAIM-3062F5AC4BD8143B
origin:
  kind: agent
  recorded_at: '2026-10-28T17:23:10.897Z'
id: TEST-proof-search-candidate-page-size
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-85761070badbc034a329fa9e
    test_id: TEST-proof-search-candidate-page-size
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 083be9035eed34d4b01493130caf49dec3c13ac637f8c4181e099dc6cbf6ba60
    binding_hash: 334c8f56c2dd2be41c869f14d4fe4c23ecf26aca89cccf827fc05eaf982a3d88
    fingerprint: f99922d44fbcbd68049aa2bfb4ee3eb736f624b73072be3821ece5e258028ed8
    fingerprint_components:
      contract: 083be9035eed34d4b01493130caf49dec3c13ac637f8c4181e099dc6cbf6ba60
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
      - symbol_id: SYM-proof-search-candidate-page-size
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-search-candidate-page-size
      variable: search_candidate_page_size
      value_type: int
      assumptions:
        - operator: eq
          value: 500
      claim:
        operator: eq
        value: 500
    certificate_digest: 6c4e090c863387f27614978edd5844b593bd3a4792a5a5cae88f79ba744dd440
    claim_bindings:
      - claim_key: CLAIM-3062F5AC4BD8143B
        requirement_id: REQ-kibi-operation-page-sizes
        fact_id: FACT-search-candidate-page-size
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 500
          value_type: int
          variable: search_candidate_page_size
---
Proves that a search candidate page shall hold at most 500 candidates, against the code Kibi reads at ingest.