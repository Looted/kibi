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
    receipt_id: PR-b3cfc8874645d71f4c2ce2df
    test_id: TEST-proof-search-candidate-page-size
    scope: unit
    outcome: passed
    code_snapshot: 6f361d2b7a0ce4be8a55a8981006015e29d04d73175b724e90cd4a7d0f2b289f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:24:49.383Z'
    finished_at: '2026-10-28T17:24:49.544Z'
    artifact_digest: 25235f877447003f0501ad4efb511ec6f250ba32b13c482d7b9f2affba326a3a
    contract_hash: 083be9035eed34d4b01493130caf49dec3c13ac637f8c4181e099dc6cbf6ba60
    binding_hash: 2cc8d71bf6f92c3a6c2a50055f5a5e3fda996f4990bda05050107bd43dd56dc8
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