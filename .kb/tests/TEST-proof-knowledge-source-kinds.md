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
    receipt_id: PR-1bebb8b768fb7807377c8081
    test_id: TEST-proof-knowledge-source-kinds
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: f8306e65e61fe4f92fd7fbdc67d0d07a7cd35c6740bf48426d00879875a4e7f3
    binding_hash: c40ef24b834fa51d9357b1d859109afb317504854a98afedde551ba89ab440ad
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