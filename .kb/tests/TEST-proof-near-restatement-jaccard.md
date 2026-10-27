---
title: The close restatement threshold is 0.8, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T08:06:12.911Z'
id: TEST-proof-near-restatement-jaccard
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-near-restatement-jaccard
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-bootstrap-near-restatement-jaccard
  proves:
    - CLAIM-D75EA03CE26FF1F2
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-83001f9410e816eef6d2b7d6
    test_id: TEST-proof-near-restatement-jaccard
    scope: unit
    outcome: passed
    code_snapshot: 1930b6bde491fcbbc77f67b0d5f56d1e187b3c4225271c211189a107ec098307
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T08:06:52.980Z'
    finished_at: '2026-10-27T08:06:53.158Z'
    artifact_digest: 03f70f74264d942ca44a8f4b69b92bfbdd0628bf362c2058616c01cd1eaf93a2
    contract_hash: a8473998337d7eec0bbe304f2d018110881b28ae7f98f2a07c6b350db75edb5a
    binding_hash: 62093234cea881ac551c32bb8347954ec928abb0fd5f5b259e15d2877b06cb11
    fingerprint: cb4f8e55db1a52837b8fe4ae6684e5e91bc1fb1731cf47d20ad1d439c9fa7132
    fingerprint_components:
      contract: a8473998337d7eec0bbe304f2d018110881b28ae7f98f2a07c6b350db75edb5a
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
      - symbol_id: SYM-proof-near-restatement-jaccard
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: tested
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-near-restatement-jaccard
      variable: near_restatement_jaccard
      value_type: real
      assumptions:
        - operator: eq
          value: 0.8
      claim:
        operator: eq
        value: 0.8
    certificate_digest: 68ab775270de253870a2657dc4e54342eddf8d4584d55edaef04e73b50175793
    claim_bindings:
      - claim_key: CLAIM-D75EA03CE26FF1F2
        requirement_id: REQ-bootstrap-claim-restatement-threshold
        fact_id: FACT-bootstrap-claim-restatement-near-jaccard
        binding: derived
        scope: intent
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 0.8
          value_type: real
          variable: near_restatement_jaccard
---
Reads NEAR_RESTATEMENT_JACCARD from the bootstrap restatement check and proves it equals the threshold the requirement states.