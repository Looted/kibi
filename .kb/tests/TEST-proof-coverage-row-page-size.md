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
    receipt_id: PR-4d8203059d6ea3dc09cad483
    test_id: TEST-proof-coverage-row-page-size
    scope: unit
    outcome: passed
    code_snapshot: 17256581582f43d83f66f4d6a118fecad7fcd8180df991d47ca9887713e21e82
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:52:53.982Z'
    finished_at: '2026-10-28T17:52:54.146Z'
    artifact_digest: ccb72c59264844bae4c8c19c6a5ca96599862203200edf04a7f7978f5bd67819
    contract_hash: daa7a105b9c696c1083504176613a188078968f203e54671bd6878fec989218d
    binding_hash: 5d836b46ba7a7d7c8480579bf1fb2d5e9b9c9c5a9b5e71065c080a47ab43ef9f
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
        requirement_id: REQ-kibi-proof-run-vocabulary
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