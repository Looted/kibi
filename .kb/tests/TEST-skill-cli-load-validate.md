---
id: TEST-skill-cli-load-validate
title: CLI skills commands load and validate the kibi-usage bundle
status: active
created_at: 2026-05-29T00:00:00.000Z
updated_at: 2026-05-29T00:00:00.000Z
source: packages/cli/tests/skills.test.ts
tags:
  - cli
  - skills
  - unit
links:
  - type: validates
    target: SCEN-reusable-skill-subsystem
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-skill-cli-load-validate
      target: default
  success_policy: all_required_first_attempt
type: test
---

Verifies listing, loading, resource reading, validation failures, and CLI command handling for bundled reusable skills.
