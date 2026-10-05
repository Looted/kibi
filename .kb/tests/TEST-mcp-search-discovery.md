---
id: TEST-mcp-search-discovery
title: Discovery bundle is verified across MCP, CLI, and packed E2E flows
status: passing
created_at: 2026-03-22T00:00:00.000Z
updated_at: 2026-03-22T00:00:00.000Z
source: documentation/tests/e2e/packed/discovery-bundle.test.ts
tags:
  - mcp
  - cli
  - discovery
  - e2e
links:
  - type: validates
    target: SCEN-mcp-search-discovery
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-mcp-search-discovery
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c886bb1ef2d0a10b141bf1c5
    test_id: TEST-mcp-search-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 391cd7081a4fcef186e7291b57af4133f1644024b5b7464bbdc96d4d98fd4064
    binding_hash: e5cdaedff2e9016ca947ac57c78311d4197d4c79bf41d361ef89df010e24db20
    fingerprint: 0d85742abe29ea00b6259b253c4651e0e13d97399e641c4027618e5b0a2e17a5
    fingerprint_components:
      contract: 391cd7081a4fcef186e7291b57af4133f1644024b5b7464bbdc96d4d98fd4064
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
      - symbol_id: SYM-e2e-test-mcp-search-discovery
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Verification covers:

- MCP handler tests for search, status, gaps, coverage, graph, diagnostics, and actionable `kb_check` text
- CLI command tests for `search`, `status`, `gaps`, `coverage`, and `graph`
- packed E2E parity checks across MCP and CLI for discovery workflows
