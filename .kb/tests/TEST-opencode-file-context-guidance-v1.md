---
id: TEST-opencode-file-context-guidance-v1
title: Verification of Lifecycle Events and E2E Evidence
type: test
status: pending
created_at: 2026-05-04T10:00:00.000Z
updated_at: 2026-05-04T10:00:00.000Z
source: documentation/requirements/REQ-opencode-file-context-guidance-v1.md
priority: must
tags:
  - opencode
  - guidance
  - e2e
  - test
links:
  - type: validates
    target: SCEN-opencode-file-context-guidance-v1
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-opencode-file-context-guidance-v1
      target: default
  success_policy: all_required_first_attempt
---

## Test Coverage

### 1. Lifecycle Event Hooking
- **Unit Tests** (`packages/opencode/tests/file-operation-state.test.ts`, `packages/opencode/tests/file-operation-reminders.test.ts`):
  - `file-operation-state.test.ts`: Asserts that `file.created`, `file.edited`, and `file.deleted` events are tracked and trigger state transitions.
  - `file-operation-reminders.test.ts`: Verifies that guidance is suppressed for `vendored_only` or `root_uninitialized` postures, and session-based suppression after the first hit per path.

### 2. E2E Evidence Logic
- **Unit Tests** (`packages/opencode/tests/e2e-coverage-signals.test.ts`):
  - Asserts that `covered_by` links to entities with `tags: [e2e]` are treated as authoritative.
  - Asserts that `covered_by` links to entities with `source` under `/e2e/` are treated as authoritative.
  - Verifies that heuristic path-matching results in soft-worded advisory text.
  - Verifies that package-level umbrella tests do not trigger "authoritative evidence" flags.

### 3. Prompt Integration
- **Unit Test** (`packages/opencode/tests/prompt.test.ts`):
  - Asserts that lifecycle guidance is merged into the single-block prompt output.
  - Verifies that `RiskClass` is not mutated by lifecycle events (lifecycle is a modifier).

### 4. Integration
- **Integration Test** (`packages/opencode/tests/index.test.ts`):
  - Verifies the full flow from host event to prompt injection in a simulated OpenCode environment.
