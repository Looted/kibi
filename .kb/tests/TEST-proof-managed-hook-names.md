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
    receipt_id: PR-005b406b1874b0298520653d
    test_id: TEST-proof-managed-hook-names
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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