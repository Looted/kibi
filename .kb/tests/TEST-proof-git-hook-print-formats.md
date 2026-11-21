---
title: A Kibi hook command print format shall be shell, lefthook, husky or pre-commit, by an exhaustive proof
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
    - symbol_id: SYM-proof-git-hook-print-formats
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  proves:
    - CLAIM-325D4EB22241A28E
  domain_source:
    symbol_id: SYM-hook-managers-hook-snippet-formats
    export: HOOK_SNIPPET_FORMATS
origin:
  kind: agent
  recorded_at: '2026-10-30T19:39:45.304Z'
id: TEST-proof-git-hook-print-formats
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-787092762030705652b4b142
    test_id: TEST-proof-git-hook-print-formats
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: e51bd39aba74818e59eae3a406224020633ba9a30955297d66569e9410127117
    binding_hash: 81868309c8a815ab031455187c6f5ee13cebed2454daae5be9e6e6a01b8bbd6a
    fingerprint: 15a98b7f15a22ac57dfc914092d24a22b3979396c0ee8b86bde92da2ba486fbb
    fingerprint_components:
      contract: e51bd39aba74818e59eae3a406224020633ba9a30955297d66569e9410127117
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
      - symbol_id: SYM-proof-git-hook-print-formats
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
      test_id: TEST-proof-git-hook-print-formats
      domain:
        symbol_id: SYM-hook-managers-hook-snippet-formats
        members:
          - shell
          - lefthook
          - husky
          - pre-commit
      results:
        - member: shell
          outcome: passed
        - member: lefthook
          outcome: passed
        - member: husky
          outcome: passed
        - member: pre-commit
          outcome: passed
    certificate_digest: c31b3f83873c279a0b844511bef69075a7e3b012bf437a163a0812f6801e1464
    claim_bindings:
      - claim_key: CLAIM-325D4EB22241A28E
        requirement_id: REQ-git-hook-print-formats
        fact_id: FACT-git-hook-print-formats
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - husky
            - lefthook
            - pre-commit
            - shell
---
Proves that a Kibi hook command print format shall be shell, lefthook, husky or pre-commit, against the code Kibi reads at ingest.