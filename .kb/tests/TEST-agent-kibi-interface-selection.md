---
id: TEST-agent-kibi-interface-selection
title: Agent guidance surface selection verification plan
type: test
status: pending
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-07-21T00:00:00.000Z
source: documentation/tests/TEST-agent-kibi-interface-selection.md
priority: must
tags:
  - opencode
  - agent
  - mcp
  - cli
  - policy
  - test
links:
  - type: validates
    target: SCEN-agent-kibi-interface-selection
  - type: relates_to
    target: ADR-022
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-agent-kibi-interface-selection
      target: default
  success_policy: all_required_first_attempt
---

## Test Coverage

### Policy Checks

- The new requirement supersedes the older MCP-only guidance by link, not by rewriting history.
- Agent-facing docs keep both public surfaces available in the traceability graph.
- The scenario proves guidance can point to a peer surface without claiming exclusivity.
