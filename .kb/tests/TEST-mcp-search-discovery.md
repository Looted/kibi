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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e2b46df46674c29c59c4fc43
    test_id: TEST-mcp-search-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 379aa918061d87d478f5c6907af80b9d31dab67e9189a94467199a38d0fd1ea4
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-05T07:12:58.943Z'
    finished_at: '2026-11-05T07:15:01.966Z'
    artifact_digest: 3f5c82d14cb8a8b24400da3cd8c4396d35d0fcc54024420697b93ffb08ca2d6d
    contract_hash: 391cd7081a4fcef186e7291b57af4133f1644024b5b7464bbdc96d4d98fd4064
    binding_hash: 9a93b4777281412068e6aa4a1357890e88bc757db103b1692998062e64926bb8
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
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Verification covers:

- MCP handler tests for search, status, gaps, coverage, graph, diagnostics, and actionable `kb_check` text
- CLI command tests for `search`, `status`, `gaps`, `coverage`, and `graph`
- packed E2E parity checks across MCP and CLI for discovery workflows
