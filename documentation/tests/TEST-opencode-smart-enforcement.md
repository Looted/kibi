---
id: TEST-opencode-smart-enforcement
title: Smart Enforcement Verification and Surface Policy
type: test
status: passing
created_at: 2026-04-03T00:00:00Z
updated_at: 2026-04-20T00:00:00Z
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
#NS|  - type: validates
#NS|    target: SCEN-opencode-file-context-guidance-v1
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
  - Briefing discovery cues (`/brief-kibi`, `kb_briefing_generate`) stay within the same budgeted block.

### Cache Invalidation Triggers

- **Unit Test** (`packages/opencode/tests/guidance-cache.test.ts`): Asserts that posture and risk context are correctly cleared on:
  - Branch change.
  - Worktree change.
  - Config file modification.

### MCP-Only Surface Preservation

  - Forbidden CLI command patterns (e.g., direct \`kibi\` CLI invocations).
  - Required MCP tool terminology (e.g., \`kb_query\`, \`kb_upsert\`).
  - Presence of retroactive bootstrap guidance (\`/init-kibi\`).

### Integration Verification

- **Integration Tests** (`packages/opencode/tests/index.test.ts`, `packages/opencode/tests/scheduler.test.ts`, `packages/opencode/tests/nonblocking.test.ts`): Verify that the plugin factory correctly wires:
  - Posture-aware guidance injection.
  - Advisory-by-default behavior (toasts/prompts) doesn't block the editor.
  - Background sync and validation tasks remain non-blocking.


### Effective Mode and Runtime Overlay

- **Policy Test** (`packages/opencode/tests/smart-enforcement-policy.test.ts`): Validates the effective-mode decision table:
  - `advisory` config always yields `advisory`.
  - `strict` + `requireRootKbForStrict=true` yields `strict` only for `root_active` and `hybrid_root_plus_vendored`.
  - `maintenanceDegraded=true` (static or runtime) overrides everything to `advisory`.
- **Integration Tests** (`packages/opencode/tests/index.test.ts`, `packages/opencode/tests/scheduler.test.ts`): Verify that the runtime maintenance overlay latches on sync disabled, scheduler unavailable, or check failures, and that the merged degraded state is reflected in logs and prompt decisions.

### Single-Block Prompt Policy and Completion Reminder

- **Unit Test** (`packages/opencode/tests/prompt.test.ts`): Asserts that injected guidance never exceeds:
  - 1 contextual guidance block per prompt injection (sentinel + at most one block).
  - 5 bullet points or 120 words total for the combined sentinel + block output.
  - Degraded advisory and completion-reminder text are folded into the single block rather than appended as separate blocks.
- **Policy Test** (`packages/opencode/tests/smart-enforcement-policy.test.ts`): Centralized contract matrix verifying the interaction of effective mode, single-block guidance outcome, completion-reminder visibility, and runtime overlay behavior.
- **Policy Test** (`packages/opencode/tests/agent-surface-policy.test.ts`): Confirms risky-edit briefing cues still preserve the MCP-only surface and sanctioned `/brief-kibi` wording.
- **Logging Test** (`packages/opencode/tests/logging-policy.test.ts`): Confirms the completion reminder emits exactly one matching structured `smart_enforcement_completion_reminder` log per risky context and is suppressed when `maintenanceDegraded` is active.
### Source-Linked Micro-Brief Verification

- **Unit Test** (`packages/opencode/tests/source-linked-guidance.test.ts`): Verifies synchronization with `documentation/symbols.yaml` and ID resolution:
  - Extracts up to 3 deduped REQ IDs.
  - Prioritizes `implements` relationships.
  - Falls back to static `links`.
  - Handles both YAML formats (array and `{ symbols: [...] }`).
- **Unit Test** (`packages/opencode/tests/prompt.test.ts`): Asserts that the micro-brief is prepended to `behavior_candidate` and `traceability_candidate` guidance.
- **Integration Test** (`packages/opencode/tests/index.test.ts`): Confirms that micro-briefs are only shown for concrete hits and suppressed on cache hits.

### Targeted Validation Routing Verification

- **Integration Test** (`packages/opencode/tests/index.test.ts`): Verifies specific rule scheduling:
  - `traceability_candidate` triggers `symbol-traceability` with reason `smart-enforcement.traceability`.
  - Fact KB document edits trigger `strict-fact-shape` along with structural checks.
  - Requirement KB document edits trigger `strict-req-fact-pairing` to surface unpaired requirements.
- **Unit Test** (`packages/opencode/tests/scheduler.test.ts`): Ensures the scheduler correctly receives and executes the targeted rules.
#NX|### File-Context and E2E Verification
#NX|
#NX|- **Unit Test** (`packages/opencode/tests/lifecycle-guidance.test.ts`): Verifies guidance triggers for `file.created`, `file.edited`, and `file.deleted`.
#NX|- **Unit Test** (`packages/opencode/tests/e2e-evidence.test.ts`): Verifies authoritative vs heuristic E2E detection logic.
