---
title: Entity and typed relationship schema round-trip
status: active
priority: must
tags:
  - cli
  - e2e
  - schema
  - relationships
verification_scope: end_to_end
verification_perspective: consumer
links:
  - type: validates
    target: REQ-004
  - type: validates
    target: REQ-005
  - type: validates
    target: SCEN-kibi-entity-relationship-schema-roundtrip
id: TEST-kibi-entity-relationship-schema-roundtrip
type: test
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-entity-relationship-schema-roundtrip
  required_case_symbols:
    - SYM-test-packed-eight-entity-schema-roundtrip
    - SYM-test-packed-typed-relationship-roundtrip
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
---

Asserts that:
- all canonical entity types (`req`, `scenario`, `test`, `adr`, `flag`, `event`, `symbol`, and `fact`) are present and queryable
- unsupported types are rejected at query time
- required fields are persisted with canonical timestamps and source provenance
- typed relationships are stored and reloaded with provenance from a fresh CLI process

