---
title: Every host hook imports the shared path, Kibi MCP call and knowledge index decisions and declares none of its own
status: passing
tags:
  - hooks
  - agent-core
  - claude
  - codex
  - cursor
  - zcode
verification_scope: unit
verification_perspective: internal
text_ref: packages/agent-core/tests/shared-hook-inputs.test.ts
origin:
  kind: agent
  recorded_at: '2026-11-04T14:37:06.710Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-agent-core-shared-hook-inputs
      target: default
  success_policy: all_required_first_attempt
id: TEST-agent-core-shared-hook-inputs
type: test
---
# Every host hook imports the shared path, Kibi MCP call and knowledge index decisions and declares none of its own

Runs `packages/agent-core/tests/shared-hook-inputs.test.ts`. For each of the Claude Code, Codex, Cursor and ZCode packages it reads the host's TypeScript sources and checks that they import `classifyPath`, `loadKnowledgeIndex` and the MCP tool name rule from kibi-agent-core, and that any local function with the same name only returns a call to the shared one. A fixture that redefines `classifyPath` shows the check catches a host that forks the decision.
