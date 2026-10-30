---
title: A knowledge source kind shall be issue_tracker, wiki, specification, design, decision_log, support, chat, repository_docs or other, by an exhaustive proof
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
    - symbol_id: SYM-proof-knowledge-source-kinds
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-kibi-bootstrap-cli-src-operations-bootstrap-types-knowledge-source-kinds
  proves:
    - CLAIM-3FE1A4A9E6C8890E
origin:
  kind: agent
  recorded_at: '2026-10-28T19:19:22.205Z'
id: TEST-proof-knowledge-source-kinds
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-5bba9e4a993015d545e5d575
    test_id: TEST-proof-knowledge-source-kinds
    scope: unit
    outcome: passed
    code_snapshot: 7b7cf5b5106d1cb9499e416a459b67802d2ab05831deaae6da49264bb5bb9465
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:20:15.881Z'
    finished_at: '2026-10-28T19:20:15.992Z'
    artifact_digest: 1c710cd0747e63a09c01c896075f41fb5bd08e7aa79474640590c7c732a41c07
    contract_hash: f8306e65e61fe4f92fd7fbdc67d0d07a7cd35c6740bf48426d00879875a4e7f3
    binding_hash: 3a9ee8be896669d4098efdd173120469bce9c1b0c62b7d67955c04fea50fa763
    fingerprint: daace74b9581733f5d45462a0bb14b651ec78f5320e9dff91380035b498bafae
    fingerprint_components:
      contract: f8306e65e61fe4f92fd7fbdc67d0d07a7cd35c6740bf48426d00879875a4e7f3
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
      - symbol_id: SYM-proof-knowledge-source-kinds
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
      test_id: TEST-proof-knowledge-source-kinds
      domain:
        symbol_id: SYM-kibi-bootstrap-cli-src-operations-bootstrap-types-knowledge-source-kinds
        members:
          - issue_tracker
          - wiki
          - specification
          - design
          - decision_log
          - support
          - chat
          - repository_docs
          - other
      results:
        - member: issue_tracker
          outcome: passed
        - member: wiki
          outcome: passed
        - member: specification
          outcome: passed
        - member: design
          outcome: passed
        - member: decision_log
          outcome: passed
        - member: support
          outcome: passed
        - member: chat
          outcome: passed
        - member: repository_docs
          outcome: passed
        - member: other
          outcome: passed
    certificate_digest: 8cd912695c9cd496f0585c9d91ce4f170bee472059691487b22227b7ae0381ea
    claim_bindings:
      - claim_key: CLAIM-3FE1A4A9E6C8890E
        requirement_id: REQ-kibi-knowledge-source-vocabulary
        fact_id: FACT-knowledge-source-kinds
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - chat
            - decision_log
            - design
            - issue_tracker
            - other
            - repository_docs
            - specification
            - support
            - wiki
---
Proves that a knowledge source kind shall be issue_tracker, wiki, specification, design, decision_log, support, chat, repository_docs or other, against the code Kibi reads at ingest.