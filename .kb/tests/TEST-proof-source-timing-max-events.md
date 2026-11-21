---
title: A source analysis shall keep at most 5000 timing events, by an arithmetic proof
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
    - symbol_id: SYM-proof-source-timing-max-events
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-source-analysis-timing-max-events
  proves:
    - CLAIM-D49D2FEFA9168696
origin:
  kind: agent
  recorded_at: '2026-10-29T10:51:56.531Z'
id: TEST-proof-source-timing-max-events
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-863806e650b3cc26732849d9
    test_id: TEST-proof-source-timing-max-events
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 47c7132c2ec43b20e5765fc47478ab9dd20e803977355231b31666b62fca3216
    binding_hash: e60862a98d601c08e273ab34be29047b2bbda29656d7e636905f9e58af74d349
    fingerprint: ad1eff809ad0fe031c308956a6a0a626ef99ecae31acb6a4e676a49ed9295898
    fingerprint_components:
      contract: 47c7132c2ec43b20e5765fc47478ab9dd20e803977355231b31666b62fca3216
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
      - symbol_id: SYM-proof-source-timing-max-events
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
      test_id: TEST-proof-source-timing-max-events
      variable: max_timing_events
      value_type: int
      assumptions:
        - operator: eq
          value: 5000
      claim:
        operator: eq
        value: 5000
    certificate_digest: 4ad4f5324b80489ccf0349d56e28054b07e2f2608861e36612ad7a2c0390cdf1
    claim_bindings:
      - claim_key: CLAIM-D49D2FEFA9168696
        requirement_id: REQ-source-analysis-timing-limits
        fact_id: FACT-source-timing-max-events
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 5000
          value_type: int
          variable: max_timing_events
---
Proves that a source analysis shall keep at most 5000 timing events, against the code Kibi reads at ingest.