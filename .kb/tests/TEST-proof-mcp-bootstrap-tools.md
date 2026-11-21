---
title: An empty knowledge base adds kb_plan_bootstrap and kb_apply_plan to the core profile
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
    - symbol_id: SYM-proof-mcp-bootstrap-tools
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-16T22:37:51.875Z'
id: TEST-proof-mcp-bootstrap-tools
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-9cb37e4db4c2e2a7f03bb0da
    test_id: TEST-proof-mcp-bootstrap-tools
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 84899f70b2680de01c7e241745f1f11fc2d638f7c270cefb556ce0346ed0d76a
    binding_hash: c9a095c004c99d9b3a877e437c0df1d46541ca1025af5e355d3673d2e5904297
    fingerprint: c27921ab52523b20cf73e84d360a940b329792f3823173e9f2bf0dcab84f31e8
    fingerprint_components:
      contract: 84899f70b2680de01c7e241745f1f11fc2d638f7c270cefb556ce0346ed0d76a
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
      - symbol_id: SYM-proof-mcp-bootstrap-tools
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Proves that the default profile adds exactly kb_plan_bootstrap and kb_apply_plan while the knowledge base holds no entity, against BOOTSTRAP_TOOLS as Kibi reads it at ingest.