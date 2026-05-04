---
id: TEST-opencode-kibi-plugin-v1
title: OpenCode Kibi Plugin v1 Automated Verification
status: active
created_at: 2026-03-13T00:00:00Z
updated_at: 2026-04-20T00:00:00Z
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
- Regression tests for start-task briefing guidance, ensuring `/brief-kibi` and `kb_briefing_generate` appear only on sanctioned MCP-facing surface.
- **File-operation reminder coverage** (`packages/opencode/tests/file-operation-reminders.test.ts`): tests create/edit/delete guidance, e2e evidence logic (exact graph evidence first, path heuristics second), session suppression, and posture-based filtering.
- **Package vs file-level e2e distinction** (`packages/opencode/tests/e2e-coverage-signals.test.ts`): verifies that package-level umbrella e2e tests do not trigger "authoritative evidence" flags at the file level, while file-level `covered_by` links to `[e2e]`-tagged or `/e2e/`-sourced entities do.
- **Packed package loader-safety test** verifying that root exports are OpenCode-loader compatible (only plugin function, no helper function exports).
- **Tarball install + plugin invocation E2E test** (`documentation/tests/e2e/packed/opencode-install.test.ts`): packs `kibi-opencode`, installs the tarball into an isolated npm prefix, dynamically imports `dist/index.js`, invokes the plugin default export with a mock `PluginInput`, and asserts a valid hooks object is returned without throwing. Also verifies installed version matches source and all subpath exports are accessible.
JQ|
- **Bootstrap path regression tests** (`documentation/tests/e2e/packed/opencode-bootstrap-paths.test.ts`): verifies healthy relocated-path workspaces (`kibi-docs/*` with `.kb/config.json`) do not emit false bootstrap warnings, and missing configured targets still emit exactly one real bootstrap warning.
- **Release-gate verification** (`.github/workflows/publish.yml`): the `Opencode packed behavior verification` step runs packed tests against downloaded tarballs using `KIBI_TEST_TARBALLS`, ensuring the published artifact matches source behavior.
- **Local e2e build freshness** (`package.json` `test:e2e:local`): ensures `packages/opencode/dist` is rebuilt before local e2e tests, preventing stale dist from breaking dogfood confidence.
- **Toast transport contract tests** (`packages/opencode/tests/toast.test.ts`): verifies legacy `client.tui.toast(payload)` preference, SDK `client.tui.showToast({ body: payload })` wrapping, `SendToastResult` discriminated union outcomes (`delivered`, `unavailable`, `failed`), timeout handling, and absence of raw HTTP fetch fallback or `console.error` trace noise.
- **Startup toast structured outcome tests** (`packages/opencode/tests/startup-notifier.test.ts`): verifies truthful structured logging for toast delivery results (`startup toast delivered`, `startup toast unavailable`, `startup toast delivery failed`) without `console.error` leakage.
- **Logger contract tests** (`packages/opencode/tests/logger.test.ts`): verifies advisory paths (`info`, `warn`, `errorStructuredOnly`) remain terminal-silent even when `client.app.log()` rejects, and operational `error()` emits exactly one prefixed `console.error` without secondary spam from structured log rejection.
- **Built-artifact toast regression** (`documentation/tests/e2e/opencode-plugin-local.test.ts`): imports `packages/opencode/dist/toast.js` directly and asserts the compiled artifact uses the structured SDK contract with no raw fallback.

All test code must reference `REQ-opencode-kibi-plugin-v1` for traceability.
All test code must reference `REQ-opencode-kibi-plugin-v1` for traceability.
