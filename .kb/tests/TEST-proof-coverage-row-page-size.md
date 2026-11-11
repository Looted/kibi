---
title: Kibi shall read coverage rows in pages of at most 10 rows, by an arithmetic proof
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
    - symbol_id: SYM-proof-coverage-row-page-size
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-cli-COVERAGE_ROW_PAGE_SIZE
  proves:
    - CLAIM-159D396F3EE48E0B
origin:
  kind: agent
  recorded_at: '2026-10-28T17:50:27.559Z'
id: TEST-proof-coverage-row-page-size
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b1a9498f47ab0c9a13b2adf7
    test_id: TEST-proof-coverage-row-page-size
    scope: unit
    outcome: passed
    code_snapshot: 7e5baec9395e8db24de4986146a623783d80d8c060c162d9fefd2be7d948a327
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-04T14:53:48.388Z'
    finished_at: '2026-11-04T14:53:48.601Z'
    artifact_digest: 880aca4e245afdba7b286304a2d779e24e4a17fb9b4f409bcf94becee975c577
    contract_hash: daa7a105b9c696c1083504176613a188078968f203e54671bd6878fec989218d
    binding_hash: cb59e98494cb263ebc7be4d967da1d5be01ad5aa0f32ec79a61549070653bce6
    fingerprint: 95dec26b6ea7d4a597efd25ee5d87534740520ae9d3fed8adf7d60a4f394d206
    fingerprint_components:
      contract: daa7a105b9c696c1083504176613a188078968f203e54671bd6878fec989218d
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
      - symbol_id: SYM-proof-coverage-row-page-size
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
      test_id: TEST-proof-coverage-row-page-size
      variable: coverage_page_size
      value_type: int
      assumptions:
        - operator: eq
          value: 10
      claim:
        operator: eq
        value: 10
    certificate_digest: a2ef2580519fdcf2829d493c4c4ccf26f96d231d10e3fa15eb5ea2c7f12cb106
    claim_bindings:
      - claim_key: CLAIM-159D396F3EE48E0B
        requirement_id: REQ-kibi-proof-retention-limits
        fact_id: FACT-coverage-row-page-size
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 10
          value_type: int
          variable: coverage_page_size
---
Proves that kibi shall read coverage rows in pages of at most 10 rows, against the code Kibi reads at ingest.