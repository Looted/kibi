---
title: kb_search question alias tests
status: passing
priority: must
tags:
  - mcp
  - validation
  - search
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-26T11:04:09.512Z'
id: TEST-kb-search-question-alias
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-cli-input-aliases
      target: default
    - symbol_id: SYM-test-mcp-input-aliases
      target: default
  success_policy: all_required_first_attempt
---
Runs `packages/cli/tests/operations/input-aliases.test.ts`, which checks that the CLI input preparation renames a declared alias to its field only when the field is absent and given under one name, that kb_search validates and runs a question as its query, refuses a question beside a query, and does not advertise question; and `packages/mcp/tests/server/input-aliases.test.ts`, which calls the MCP kb_search wrapper with a question and checks that the operation receives it as query, and that a question beside a query is refused with VALIDATION_FAILED.