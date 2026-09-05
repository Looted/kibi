---
id: TEST-001
title: kibi init creates .kb/ directory structure
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: must
tags:
  - cli
  - init
  - unit
links:
  - type: validates
    target: SCEN-001
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-001
      target: default
  success_policy: all_required_first_attempt
type: test
---

Validates that `kibi init` creates `.kb/config.json`, `.kb/schema/`, and
`.kb/branches/main/` in a temp directory. Asserts all three paths exist and
`config.json` is valid JSON with a `paths` object.
