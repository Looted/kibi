---
id: TEST-opencode-file-context-guidance-v1
title: Verification of Lifecycle Events and E2E Evidence
type: test
status: pending
created_at: 2026-05-04T10:00:00Z
updated_at: 2026-05-04T10:00:00Z
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
---

## Test Coverage

### 1. Lifecycle Event Hooking
- **Unit Test** (`packages/opencode/tests/lifecycle-guidance.test.ts`):
  - Asserts that `file.created`, `file.edited`, and `file.deleted` events trigger guidance injection.
  - Verifies that guidance is suppressed for `vendored_only` or `root_uninitialized` postures.
  - Verifies session-based suppression after the first hit per path.

### 2. E2E Evidence Logic
- **Unit Test** (`packages/opencode/tests/e2e-evidence.test.ts`):
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
