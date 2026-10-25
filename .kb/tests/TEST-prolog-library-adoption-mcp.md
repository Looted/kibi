---
id: TEST-prolog-library-adoption-mcp
title: MCP remote SPARQL handler validation tests
status: passing
created_at: 2026-06-02T00:00:00.000Z
updated_at: 2026-06-02T00:00:00.000Z
source: packages/mcp/tests/tools/sparql.test.ts
tags:
  - mcp
  - sparql
  - security
  - unit
links:
  - type: validates
    target: SCEN-prolog-library-adoption
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-prolog-library-adoption-mcp
      target: default
  success_policy: all_required_first_attempt
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Verification covers argument validation, public remote endpoint restrictions, SELECT-only query enforcement, Prolog query construction, structured MCP responses, and error wrapping for `kb_sparql_remote`.
