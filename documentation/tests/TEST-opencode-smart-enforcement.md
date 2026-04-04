---
id: TEST-opencode-smart-enforcement
title: Smart Enforcement Verification and Surface Policy
type: test
status: passing
created_at: 2026-04-03T00:00:00Z
updated_at: 2026-04-03T00:00:00Z
source: documentation/tests/TEST-opencode-smart-enforcement.md
priority: must
tags:
  - enforcement
  - opencode
  - kibi
  - test
---

## Test Coverage

### Posture Detection Accuracy

- **Unit Tests** (`packages/opencode/tests/repo-posture.test.ts`, `packages/opencode/tests/workspace-health.test.ts`): Verify the posture detection logic across:
  - Empty repo (`root_uninitialized`).
  - Valid `.kb/config.json` (root_active).
  - Vendored `.kb/` (vendored_only).
  - Root + vendored markers (`hybrid_root_plus_vendored`).
  - Relocated KB paths and degraded maintenance cases.

### Risk Classification Correctness

- **Unit Test** (`packages/opencode/tests/risk-classifier.test.ts`): Verifies that action-to-risk mappings correctly identify:
  - `kb_doc_structural` for scenario/ADR/fact-like KB document edits.
  - `req_policy_candidate` for requirement edits.
  - `behavior_candidate` / `traceability_candidate` for code edits.
  - `manual_kb_edit` for direct `.kb/` file edits.

### Token Budget Compliance

- **Unit Test** (`packages/opencode/tests/prompt.test.ts`): Asserts that injected guidance never exceeds:
  - 1 guidance block per session injection.
  - 5 bullet points per block.
  - 120 words per block.

### Cache Invalidation Triggers

- **Unit Test** (`packages/opencode/tests/guidance-cache.test.ts`): Asserts that posture and risk context are correctly cleared on:
  - Branch change.
  - Worktree change.
  - Config file modification.

### MCP-Only Surface Preservation

- **Policy Test** (`packages/opencode/tests/agent-surface-policy.test.ts`): Scans all smart enforcement guidance candidates for:
  - Forbidden CLI command patterns (e.g., `kibi sync`, `kibi query`).
  - Required MCP tool terminology (e.g., `kb_query`, `kb_upsert`).
  - Presence of bootstrap nudges for `/init-kibi`.

### Integration Verification

- **Integration Tests** (`packages/opencode/tests/index.test.ts`, `packages/opencode/tests/scheduler.test.ts`, `packages/opencode/tests/nonblocking.test.ts`): Verify that the plugin factory correctly wires:
  - Posture-aware guidance injection.
  - Advisory-by-default behavior (toasts/prompts) doesn't block the editor.
  - Background sync and validation tasks remain non-blocking.
