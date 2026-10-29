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
    receipt_id: PR-2e49494392ca75bd68c3f3ba
    test_id: TEST-proof-source-timing-max-events
    scope: unit
    outcome: passed
    code_snapshot: 550638126aad4d2142298433cf12a24a96b7e9f153ca256ca14588e6ac150799
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T10:57:24.313Z'
    finished_at: '2026-10-29T10:57:24.497Z'
    artifact_digest: e9ad3cccbb0fe951b482ac3c3f95bc2aa8a0888abea344fa969f2a4c4f0956d2
    contract_hash: 47c7132c2ec43b20e5765fc47478ab9dd20e803977355231b31666b62fca3216
    binding_hash: 41f0a539922e19664f6c4c89e200aa9037a84e6afa3aa89917bf02a728aab645
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