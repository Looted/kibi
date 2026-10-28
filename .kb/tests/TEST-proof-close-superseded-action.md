---
title: The close superseded requirements action id shall be close-superseded-requirements, by a regex proof
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
    - symbol_id: SYM-proof-close-superseded-action
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-check-actions-CLOSE_SUPERSEDED_REQUIREMENTS_ACTION_ID
  proves:
    - CLAIM-A828DCDEB8EF98C8
origin:
  kind: agent
  recorded_at: '2026-10-28T20:26:23.839Z'
id: TEST-proof-close-superseded-action
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-9ba201113f160b80c796e5e1
    test_id: TEST-proof-close-superseded-action
    scope: unit
    outcome: passed
    code_snapshot: 9afa255658d83e8294a2a4477e9a1c2905e91f21f6fd19f74373b92404007bd5
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:28:44.849Z'
    finished_at: '2026-10-28T20:28:44.969Z'
    artifact_digest: 9164d9d60c284cbf99a897adc93e225627aa013daf777edfbd11f668b0119a6c
    contract_hash: f81c1ea4db1fd9f9f1765127479b3b0bbbe96ecc8828e1f53845e37560462b27
    binding_hash: 9b35202f68cf8adb8caa6c1df5a3558feb4f708a86a26f6685b5b2691899cf03
    fingerprint: 91eb65c2d0fa0d24872e6fc21f5246b3e5b1db6c775c31f3dfc14a84549d0337
    fingerprint_components:
      contract: f81c1ea4db1fd9f9f1765127479b3b0bbbe96ecc8828e1f53845e37560462b27
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
      - symbol_id: SYM-proof-close-superseded-action
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
      test_id: TEST-proof-close-superseded-action
      pattern:
        symbol_id: SYM-schema6-check-actions-CLOSE_SUPERSEDED_REQUIREMENTS_ACTION_ID
        type: string
        value: close-superseded-requirements
    certificate_digest: fef6b5c7f195013394e700f4bb6926e9731a1def6d9846eb18066f2927ba4dff
    claim_bindings:
      - claim_key: CLAIM-A828DCDEB8EF98C8
        requirement_id: REQ-kibi-lifecycle-review-actions
        fact_id: FACT-close-superseded-action
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: close-superseded-requirements
---
Proves that the close superseded requirements action id shall be close-superseded-requirements, against the code Kibi reads at ingest.