---
title: The context restatement threshold shall be a Jaccard similarity of 0.8, by an arithmetic proof
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
    - symbol_id: SYM-proof-context-restatement-jaccard
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-entity-body-context-restatement-jaccard
  proves:
    - CLAIM-1D3F76DD5F69F22E
origin:
  kind: agent
  recorded_at: '2026-10-28T10:39:33.956Z'
id: TEST-proof-context-restatement-jaccard
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f6b6503ea951dc95e269e21b
    test_id: TEST-proof-context-restatement-jaccard
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 69010c58a1d8951919e37c915e9c6c2edf0726167c97ab95b45f312b826b0652
    binding_hash: 38f15685cd8a4707728ab720227f5ea505695fece490865d45a67b9a91cbaf7e
    fingerprint: 03b3df122a0bf7d0231dc3899b91d3b923af59d6e8d96284107ad9d057be130c
    fingerprint_components:
      contract: 69010c58a1d8951919e37c915e9c6c2edf0726167c97ab95b45f312b826b0652
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
      - symbol_id: SYM-proof-context-restatement-jaccard
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
      test_id: TEST-proof-context-restatement-jaccard
      variable: context_restatement_jaccard
      value_type: real
      assumptions:
        - operator: eq
          value: 0.8
      claim:
        operator: eq
        value: 0.8
    certificate_digest: bcf68057342b2cd45da484bec0ce6b4c0ea912018404fe651399201c03c0bea7
    claim_bindings:
      - claim_key: CLAIM-1D3F76DD5F69F22E
        requirement_id: REQ-kb-entity-body-context-settings
        fact_id: FACT-context-restatement-jaccard
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 0.8
          value_type: real
          variable: context_restatement_jaccard
---
Proves that the context restatement threshold shall be a Jaccard similarity of 0.8, against the code Kibi reads at ingest.