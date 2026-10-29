---
title: A source analysis timing trace shall keep at most 524288 bytes, by an arithmetic proof
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
    - symbol_id: SYM-proof-source-timing-max-bytes
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-source-analysis-timing-max-bytes
  proves:
    - CLAIM-B83A4C1A65B84520
origin:
  kind: agent
  recorded_at: '2026-10-29T10:52:26.465Z'
id: TEST-proof-source-timing-max-bytes
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-6375d4c54673e7ef9359ef65
    test_id: TEST-proof-source-timing-max-bytes
    scope: unit
    outcome: passed
    code_snapshot: 550638126aad4d2142298433cf12a24a96b7e9f153ca256ca14588e6ac150799
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T10:57:36.776Z'
    finished_at: '2026-10-29T10:57:36.979Z'
    artifact_digest: 186429ea6000b466de41d42c6738795159fe7c5044f46138b6405918890b3677
    contract_hash: cc9552135e18a83924f03deea32a059ff6e53b463721a97dc27ddd88272db170
    binding_hash: ea5879922431b5f17b6c1fe1a6bb17c5206ca26005ef1160cd11b30f7218dfe6
    fingerprint: b7227afe93dadeec1c2db7bcac07c35d9c2ed315d6be7d263be69b4992266252
    fingerprint_components:
      contract: cc9552135e18a83924f03deea32a059ff6e53b463721a97dc27ddd88272db170
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
      - symbol_id: SYM-proof-source-timing-max-bytes
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
      test_id: TEST-proof-source-timing-max-bytes
      variable: max_timing_bytes
      value_type: int
      assumptions:
        - operator: eq
          value: 524288
      claim:
        operator: eq
        value: 524288
    certificate_digest: b8d7cfd373a0d3bb13af1ecf1182c1df9690e2a884584d608165af64c297c73e
    claim_bindings:
      - claim_key: CLAIM-B83A4C1A65B84520
        requirement_id: REQ-source-analysis-timing-limits
        fact_id: FACT-source-timing-max-bytes
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 524288
          value_type: int
          variable: max_timing_bytes
---
Proves that a source analysis timing trace shall keep at most 524288 bytes, against the code Kibi reads at ingest.