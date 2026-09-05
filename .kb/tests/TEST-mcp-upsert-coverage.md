---
id: TEST-mcp-upsert-coverage
title: MCP upsert handler unit coverage exercises validation and failure paths
status: active
created_at: 2026-03-30T00:00:00.000Z
updated_at: 2026-03-30T00:00:00.000Z
priority: must
tags:
  - mcp
  - test
  - upsert
  - coverage
source: packages/mcp/tests/tools/upsert.test.ts
links:
  - type: validates
    target: SCEN-001
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-mcp-upsert-coverage
      target: default
  success_policy: all_required_first_attempt
type: test
---

Validation steps:
- run `bun test packages/mcp/tests/tools/upsert.test.ts packages/mcp/tests/tools/upsert-contradictions.test.ts packages/mcp/tests/tools/crud.test.ts`
- run `bun test --coverage packages/mcp/tests/tools/upsert.test.ts packages/mcp/tests/tools/upsert-contradictions.test.ts packages/mcp/tests/tools/crud.test.ts`
- verify `packages/mcp/src/tools/upsert.ts` reports 100% line coverage
- verify mocked paths cover validation, contradiction formatting, audit/save failures, and symbol refresh warnings
