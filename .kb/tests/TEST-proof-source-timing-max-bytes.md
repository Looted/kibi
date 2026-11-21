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
    receipt_id: PR-78e7a99221f9bf57ac21e7b9
    test_id: TEST-proof-source-timing-max-bytes
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: cc9552135e18a83924f03deea32a059ff6e53b463721a97dc27ddd88272db170
    binding_hash: ce2004ea2e823809fc5ce20f44b082344363aada55613762668ee536006d1a24
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