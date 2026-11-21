---
title: The unknown scenario feasibility review code shall be review_scenario_feasibility_unknown, by a regex proof
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
    - symbol_id: SYM-proof-feasibility-review-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-check-actions-SCENARIO_FEASIBILITY_REVIEW_CODE
  proves:
    - CLAIM-32019240AFC60906
origin:
  kind: agent
  recorded_at: '2026-10-28T20:28:06.023Z'
id: TEST-proof-feasibility-review-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-dbe9c92b9a18600e46ac2bbf
    test_id: TEST-proof-feasibility-review-code
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 9b1137ba89a1a728c4b7e8fa39c8c893bda6d1af0e27790f5901b1704dffd602
    binding_hash: 8377fcc1a934edcdcad0240e78789efcafc5c210b65bf4e9e3243c9a6157d0e2
    fingerprint: eb1649293448b2ecf0c48f0e2e5f594bb9261e9122381ede7c47cbbd4b308a36
    fingerprint_components:
      contract: 9b1137ba89a1a728c4b7e8fa39c8c893bda6d1af0e27790f5901b1704dffd602
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
      - symbol_id: SYM-proof-feasibility-review-code
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
      test_id: TEST-proof-feasibility-review-code
      pattern:
        symbol_id: SYM-schema6-check-actions-SCENARIO_FEASIBILITY_REVIEW_CODE
        type: string
        value: review_scenario_feasibility_unknown
    certificate_digest: 025c6fb8d24a1a472c1769b0fe7d2ba974e028a6995694b8baef9678c5f0c0ea
    claim_bindings:
      - claim_key: CLAIM-32019240AFC60906
        requirement_id: REQ-kibi-lifecycle-review-actions
        fact_id: FACT-feasibility-review-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: review_scenario_feasibility_unknown
---
Proves that the unknown scenario feasibility review code shall be review_scenario_feasibility_unknown, against the code Kibi reads at ingest.