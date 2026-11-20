---
title: A health report proof gate shall be semantic, scenario, implementation, e2e, evidence or proved, by an exhaustive proof
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-report-proof-gate-keys
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-cli-report-proof-gate-keys
  proves:
    - CLAIM-792537721948631C
origin:
  kind: agent
  recorded_at: '2026-10-29T10:25:43.457Z'
id: TEST-proof-report-proof-gate-keys
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d9f1bf93899f91bdab1dcd02
    test_id: TEST-proof-report-proof-gate-keys
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 5e7e62975869086ec1d751ea3aba390c9d2791f1536b7ffb9bb90619581b100d
    binding_hash: ccf144a20c9c707849c9d45d29a255da55474d64d1cf7ab3ea1f4c86ebc989b7
    fingerprint: eb5c9001c5ba48770cbc50d1c5e789637b403d4ffb07ec8453d113bce3e33757
    fingerprint_components:
      contract: 5e7e62975869086ec1d751ea3aba390c9d2791f1536b7ffb9bb90619581b100d
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
      - symbol_id: SYM-proof-report-proof-gate-keys
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-proof-report-proof-gate-keys
      domain:
        symbol_id: SYM-cli-report-proof-gate-keys
        members:
          - semantic
          - scenario
          - implementation
          - e2e
          - evidence
          - proved
      results:
        - member: semantic
          outcome: passed
        - member: scenario
          outcome: passed
        - member: implementation
          outcome: passed
        - member: e2e
          outcome: passed
        - member: evidence
          outcome: passed
        - member: proved
          outcome: passed
    certificate_digest: 8ae95e12fab3b2423caece80193394a675b3f564c94cdc2d8fae4d9dc76299f9
    claim_bindings:
      - claim_key: CLAIM-792537721948631C
        requirement_id: REQ-kibi-report-filters-and-gates
        fact_id: FACT-report-proof-gate-keys
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - e2e
            - evidence
            - implementation
            - proved
            - scenario
            - semantic
---
Proves that a health report proof gate shall be semantic, scenario, implementation, e2e, evidence or proved, against the code Kibi reads at ingest.