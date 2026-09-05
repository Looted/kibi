---
id: TEST-opencode-smart-enforcement
title: Smart Enforcement Verification and Surface Policy
type: test
status: passing
created_at: 2026-04-03T00:00:00.000Z
updated_at: 2026-04-20T00:00:00.000Z
source: documentation/tests/TEST-opencode-smart-enforcement.md
priority: must
tags:
  - enforcement
  - opencode
  - kibi
  - test
links:
  - type: validates
    target: SCEN-opencode-smart-enforcement
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-opencode-smart-enforcement
      target: default
  success_policy: all_required_first_attempt
---
Verify smart enforcement reads typed Kibi status and next actions, routes general work to canonical skills, routes explicit bootstrap requests to kibi-bootstrap, and keeps guidance advisory.
