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
    receipt_id: PR-159c7f42e1aff49ba40489ce
    test_id: TEST-proof-git-hook-print-formats
    scope: unit
    outcome: passed
    code_snapshot: e2663d10a2e1a0b8fdd0d38e888ee46d8031436be2244a613e1c406fbfa714b0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-30T19:45:24.637Z'
    finished_at: '2026-10-30T19:45:24.798Z'
    artifact_digest: 3a54fe4b260cf63008770d0d624177838022d3e0f919c8ae3571c54ae784b410
    contract_hash: e51bd39aba74818e59eae3a406224020633ba9a30955297d66569e9410127117
    binding_hash: d7750732f755e34e3dd1693555659f2179e4ae6ae61bfda1f70798b7a35e90c5
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