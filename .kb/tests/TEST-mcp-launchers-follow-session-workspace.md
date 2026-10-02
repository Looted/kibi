---
title: Codex, Cursor, ZCode, and Claude launchers follow MCP roots and share one session proxy
status: passing
priority: must
tags:
  - mcp
  - worktree
  - launcher
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-mcp-launchers-follow-session-workspace
      target: default
  success_policy: all_required_first_attempt
id: TEST-mcp-launchers-follow-session-workspace
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-48bb6c13ee1ed1028cd306d4
    test_id: TEST-mcp-launchers-follow-session-workspace
    scope: end_to_end
    outcome: passed
    code_snapshot: 378af9c44994d2053b3895430f528fb957e979c883f509ef28572f47881ccc9a
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-10-02T12:11:02.479Z'
    finished_at: '2026-10-02T12:11:04.854Z'
    artifact_digest: 605e40a5fe5da1b2c0d93828d83fa65ef7459033dd7a445a717774b8c4ac8fef
    contract_hash: 743d67335cc01ba8ee380c5f186701ae54549f6cb7c69a0411a99b8ff7809f2f
    binding_hash: 88b3f99a219b67f3fdaf5650eab63590ef12a07a36f74c9baff98e0e5ef18d10
    fingerprint: 88ec020d5b1af99614b30e8745bdbdcd41f0b6c964f7d00b8840c2d88f215a0d
    fingerprint_components:
      contract: 743d67335cc01ba8ee380c5f186701ae54549f6cb7c69a0411a99b8ff7809f2f
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
      - symbol_id: SYM-test-mcp-launchers-follow-session-workspace
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
