---
id: SCEN-opencode-file-context-guidance-v1
title: File-context guidance triggers on lifecycle events and E2E detection
type: scenario
status: active
created_at: 2026-05-04T10:00:00Z
updated_at: 2026-05-04T10:00:00Z
source: documentation/requirements/REQ-opencode-file-context-guidance-v1.md
priority: must
tags:
  - opencode
  - guidance
  - lifecycle
  - e2e
links:
  - type: relates_to
    target: SCEN-opencode-enforcement
---

## Scenario: Lifecycle Guidance

An agent is working in an OpenCode session with a `root_active` Kibi posture.

### Steps
1. **File Creation**: The agent creates a new file `src/auth/new-provider.ts`.
2. **Detection**: The plugin detects the `file.created` event.
3. **Guidance**: The plugin injects a soft-worded reminder in the prompt block to document the new file's intent in Kibi (e.g., via `REQ` or `FACT`).
4. **File Deletion**: The agent deletes an existing file `src/legacy/utils.ts`.
5. **Detection**: The plugin detects the `file.deleted` event.
6. **Safety Check**: The plugin injects a reminder to verify if `src/legacy/utils.ts` had any `implements` or `covered_by` links that need cleanup or migration in Kibi.

## Scenario: E2E Evidence Detection

An agent is editing a file `src/app/core.ts`.

### Steps
1. **Graph Lookup**: The plugin queries the Kibi graph for `covered_by` relationships for symbols in `src/app/core.ts`.
2. **Case A (Authoritative)**: A link is found to `TEST-e2e-auth-flow` which has `tags: [e2e]`.
   - **Outcome**: Guidance explicitly states that authoritative E2E coverage exists.
3. **Case B (Heuristic)**: No graph link is found, but the file path `src/app/core.ts` is mentioned in `tests/e2e/smoke.test.ts`.
   - **Outcome**: Guidance provides a soft-worded heuristic reminder about potential E2E relevance.
4. **Case C (Umbrella)**: The only link found is to a package-level `TEST-opencode-umbrella`.
   - **Outcome**: Guidance does not claim exact E2E evidence.
