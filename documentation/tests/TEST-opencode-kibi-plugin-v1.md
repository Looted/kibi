---
id: TEST-opencode-kibi-plugin-v1
title: OpenCode Kibi Plugin v1 Automated Verification
status: active
created_at: 2026-03-13T00:00:00Z
updated_at: 2026-03-22T00:00:00Z
priority: must
tags:
  - opencode
  - kibi
  - test
  - enforcement
links:
  - type: validates
    target: SCEN-opencode-kibi-plugin-v1
---

Automated verification for the OpenCode Kibi Plugin v1 requirement includes:

- Unit tests for prompt guidance injection logic and correct surfacing of requirements in the OpenCode session flow.
- Integration tests for debounced, non-blocking KB sync execution after file edits (via MCP tools or background sync), ensuring sync does not block or degrade UX.
- Tests for structured log and toast surfacing, including error and success cases, without blocking the main workflow.
- Configuration tests for plugin settings (debounce interval, sync behavior) to ensure user control and correct propagation.
- Unit tests for dynamic contextual guidance based on edit type (code, requirement, ADR, KB-doc, `.kb`).
- Unit tests for path classification and artifact type detection.
- Unit tests for durable knowledge classification (FACT-first routing, ADR vs REQ heuristics).
- Unit tests for invalid authoring pattern detection (embedded scenarios/tests in requirements).
- Integration tests for targeted background validation checks after KB-document edits (via MCP `kb_check`).
- Tests for loud warning behavior when `.kb/**` files are edited, directing agents to MCP tools.
- Tests for bootstrap/health detection and nudges toward `/init-kibi` slash command with operator escalation for further setup.
- **Packed package loader-safety test** verifying that root exports are OpenCode-loader compatible (only plugin function, no helper function exports).
- **Tarball install + plugin invocation E2E test** (`documentation/tests/e2e/packed/opencode-install.test.ts`): packs `kibi-opencode`, installs the tarball into an isolated npm prefix, dynamically imports `dist/index.js`, invokes the plugin default export with a mock `PluginInput`, and asserts a valid hooks object is returned without throwing. Also verifies installed version matches source and all subpath exports are accessible.
JQ|
- **Bootstrap path regression tests** (`documentation/tests/e2e/packed/opencode-bootstrap-paths.test.ts`): verifies healthy relocated-path workspaces (`kibi-docs/*` with `.kb/config.json`) do not emit false bootstrap warnings, and missing configured targets still emit exactly one real bootstrap warning.
- **Release-gate verification** (`.github/workflows/publish.yml`): the `Opencode packed behavior verification` step runs packed tests against downloaded tarballs using `KIBI_TEST_TARBALLS`, ensuring the published artifact matches source behavior.
- **Local e2e build freshness** (`package.json` `test:e2e:local`): ensures `packages/opencode/dist` is rebuilt before local e2e tests, preventing stale dist from breaking dogfood confidence.

All test code must reference `REQ-opencode-kibi-plugin-v1` for traceability.
All test code must reference `REQ-opencode-kibi-plugin-v1` for traceability.