---
title: A Kibi-managed git hook shall be post-checkout, post-merge, post-rewrite or pre-commit, by an exhaustive proof
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
    - symbol_id: SYM-proof-managed-hook-names
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-init-helpers-managed-hook-names
  proves:
    - CLAIM-3CDE819547F73291
origin:
  kind: agent
  recorded_at: '2026-10-28T22:40:45.471Z'
id: TEST-proof-managed-hook-names
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ff6c778dc790d512e490088e
    test_id: TEST-proof-managed-hook-names
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 6c567af6a52ba836d02667ed139e3f0ff4953962a24e9b1b7718054c6c4b41c1
    binding_hash: 67337406a3810aace9f3fd752191c169200d062df209294725f852da52a69ce0
    fingerprint: 04590ec5a1d142f80b23348970abdd9f84e6fc452beb970b4fd0bffe2ee94493
    fingerprint_components:
      contract: 6c567af6a52ba836d02667ed139e3f0ff4953962a24e9b1b7718054c6c4b41c1
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
      - symbol_id: SYM-proof-managed-hook-names
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
      test_id: TEST-proof-managed-hook-names
      domain:
        symbol_id: SYM-init-helpers-managed-hook-names
        members:
          - post-checkout
          - post-merge
          - post-rewrite
          - pre-commit
      results:
        - member: post-checkout
          outcome: passed
        - member: post-merge
          outcome: passed
        - member: post-rewrite
          outcome: passed
        - member: pre-commit
          outcome: passed
    certificate_digest: e99b29cdc4848dbc7218136a106e50c70b320cd82e2c330ad44c8fb3b8f5e0a8
    claim_bindings:
      - claim_key: CLAIM-3CDE819547F73291
        requirement_id: REQ-git-hook-managed-names
        fact_id: FACT-managed-hook-names
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - post-checkout
            - post-merge
            - post-rewrite
            - pre-commit
---
Proves that a Kibi-managed git hook shall be post-checkout, post-merge, post-rewrite or pre-commit, against the code Kibi reads at ingest.