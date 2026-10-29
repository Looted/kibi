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
    receipt_id: PR-bc232db469eb911674683884
    test_id: TEST-proof-report-proof-gate-keys
    scope: unit
    outcome: passed
    code_snapshot: 9a419971de9c6e154c01df120b9f70cdfb63d9847302bf2944c091e73ffe18b7
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T10:28:28.888Z'
    finished_at: '2026-10-29T10:28:29.043Z'
    artifact_digest: 6308090a39450fc7b3b51644ac12293074310c4389887ce673201e97abbfea3f
    contract_hash: 5e7e62975869086ec1d751ea3aba390c9d2791f1536b7ffb9bb90619581b100d
    binding_hash: 817d369252e7d2c36210e5291ed984ab472f34f9cc9dce673d271a3fd41a5fdf
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