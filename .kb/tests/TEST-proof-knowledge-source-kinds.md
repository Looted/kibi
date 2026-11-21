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
    receipt_id: PR-82d112b1ae7b2e6e4f708387
    test_id: TEST-proof-knowledge-source-kinds
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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