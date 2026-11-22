---
title: A Python source file shall end in .py or .pyi, by an exhaustive proof
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
    - symbol_id: SYM-proof-tree-sitter-python-extensions
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-source-analysis-v2-tree-sitter-languages-dae6879e
    export: TREE_SITTER_LANGUAGES.python.extensions
  proves:
    - CLAIM-7EF27325E2CE1902
origin:
  kind: agent
  recorded_at: '2026-10-28T22:41:59.594Z'
id: TEST-proof-tree-sitter-python-extensions
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c62a3ef61e793d8eb60dea97
    test_id: TEST-proof-tree-sitter-python-extensions
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 13f780720627028ad3a3f6659629a855f4e2726cb56f4e4f4fb85fdef8e7a05a
    binding_hash: 7474d8596baa4f630c8af90cfbaa0792cad852d51ed2ed34c552f0c3e17568d0
    fingerprint: 3317bcdd0e598a1522dd2a7490aaa4a4231246c7b65d4d0f5275e29ba2859238
    fingerprint_components:
      contract: 13f780720627028ad3a3f6659629a855f4e2726cb56f4e4f4fb85fdef8e7a05a
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
      - symbol_id: SYM-proof-tree-sitter-python-extensions
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
      test_id: TEST-proof-tree-sitter-python-extensions
      domain:
        symbol_id: SYM-source-analysis-v2-tree-sitter-languages-dae6879e
        members:
          - .py
          - .pyi
      results:
        - member: .py
          outcome: passed
        - member: .pyi
          outcome: passed
    certificate_digest: a5ff9ff9af59a18794f0d525131ec609fdd4d1e2e862adf89792c9902c3e05a2
    claim_bindings:
      - claim_key: CLAIM-7EF27325E2CE1902
        requirement_id: REQ-tree-sitter-language-set
        fact_id: FACT-tree-sitter-python-extensions
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - .py
            - .pyi
---
Proves that a Python source file shall end in .py or .pyi, against the code Kibi reads at ingest.