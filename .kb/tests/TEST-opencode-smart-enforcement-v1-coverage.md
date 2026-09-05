---
id: TEST-opencode-smart-enforcement-v1-coverage
title: Verify posture-aware OpenCode smart enforcement
status: active
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-07-21T00:00:00.000Z
priority: must
links:
  - type: validates
    target: REQ-opencode-smart-enforcement-v1
  - type: validates
    target: SCEN-opencode-smart-enforcement-v1-coverage
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-opencode-smart-enforcement-v1-coverage
      target: default
  success_policy: all_required_first_attempt
type: test
---

Run smart-enforcement cases for safe and risky edits and assert contextual guidance, sanctioned briefing routing, and bounded token noise.
