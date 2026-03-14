---
id: TEST-opencode-kibi-plugin-v1
title: OpenCode Kibi Plugin v1 Automated Verification
status: active
created_at: 2026-03-13T00:00:00Z
updated_at: 2026-03-13T00:00:00Z
priority: must
tags:
  - opencode
  - kibi
  - test
links:
  - REQ-opencode-kibi-plugin-v1
---

Automated verification for the OpenCode Kibi Plugin v1 requirement includes:

- Unit tests for prompt guidance injection logic and correct surfacing of requirements in the OpenCode session flow.
- Integration tests for debounced, non-blocking `kibi sync` execution after file edits, ensuring sync does not block or degrade UX.
- Tests for structured log and toast surfacing, including error and success cases, without blocking the main workflow.
- Configuration tests for plugin settings (debounce interval, sync behavior) to ensure user control and correct propagation.

All test code must reference `REQ-opencode-kibi-plugin-v1` for traceability.