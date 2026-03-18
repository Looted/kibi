---
id: TEST-opencode-kibi-plugin-v1
title: OpenCode Kibi Plugin v1 Automated Verification
status: active
created_at: 2026-03-13T00:00:00Z
updated_at: 2026-03-17T00:00:00Z
priority: must
tags:
  - opencode
  - kibi
  - test
  - enforcement
links:
  - REQ-opencode-kibi-plugin-v1
---

Automated verification for the OpenCode Kibi Plugin v1 requirement includes:

- Unit tests for prompt guidance injection logic and correct surfacing of requirements in the OpenCode session flow.
- Integration tests for debounced, non-blocking `kibi sync` execution after file edits, ensuring sync does not block or degrade UX.
- Tests for structured log and toast surfacing, including error and success cases, without blocking the main workflow.
- Configuration tests for plugin settings (debounce interval, sync behavior) to ensure user control and correct propagation.
- Unit tests for dynamic contextual guidance based on edit type (code, requirement, ADR, KB-doc, `.kb`).
- Unit tests for path classification and artifact type detection.
- Unit tests for durable knowledge classification (FACT-first routing, ADR vs REQ heuristics).
- Unit tests for invalid authoring pattern detection (embedded scenarios/tests in requirements).
- Integration tests for targeted background validation checks after KB-document edits.
- Tests for loud warning behavior when `.kb/**` files are edited.
- Tests for bootstrap/health detection and nudges toward `/init-kibi` and `kibi init`.
- **Packed package loader-safety test** verifying that root exports are OpenCode-loader compatible (only plugin function, no helper function exports).

All test code must reference `REQ-opencode-kibi-plugin-v1` for traceability.