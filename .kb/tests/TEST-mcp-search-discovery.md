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
---

Verification covers:

- MCP handler tests for search, status, gaps, coverage, graph, diagnostics, and actionable `kb_check` text
- CLI command tests for `search`, `status`, `gaps`, `coverage`, and `graph`
- packed E2E parity checks across MCP and CLI for discovery workflows
