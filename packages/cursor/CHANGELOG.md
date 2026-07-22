# kibi-cursor

## 0.4.0

### Minor Changes

- a0fee4a: The Cursor plugin now supports capability-based Kibi interface selection, using visible MCP tools first and a trusted project-local CLI fallback when needed. Deterministic worktree resolution keeps both interface choices anchored to the intended repository.

  - Add MCP-first, CLI-fallback agent guidance.
  - Resolve trusted worktree runtime paths deterministically.

### Patch Changes

- cafa25f: Agents can now select Kibi by available capability instead of stopping at MCP-specific guidance. The bundled skills prefer approved MCP tools, fall back safely to a project-local non-installing CLI runner, and provide executable JSON recipes plus an exact 18-operation access catalog.

  - Document every shared MCP operation's dedicated CLI route, input mode, effects, Prolog requirement, mutability, and telemetry handling.
  - Regenerate Cursor and Codex skill mirrors from the canonical capability-based source.

- 23e815a: Agents can now keep using Kibi when MCP tools are unavailable but a trusted project-local CLI is ready. Guidance across Cursor, OpenCode, and MCP documentation now selects the interface by capability and stops for operator action only when neither safe surface is available.

  - Replace MCP-exclusive guidance with the visible-MCP, trusted-CLI JSON route, and blocked state machine.
  - Preserve direct `.kb/` access prohibitions, discovery-before-mutation, sequential writes, and completion validation gates.

- e71f1ce: Cursor dogfood sessions now keep each linked worktree as the Kibi data workspace while launching a compatible built MCP runtime from that worktree or its primary checkout. Invalid, stale, or unrelated builds are rejected without installing packages, and Cursor hooks offer the project-local CLI only as advisory guidance after explicit workspace trust.

  - Add deterministic build, runtime, SWI-Prolog, and package-version checks to the Cursor worktree resolver.
  - Preserve an explicit `KIBI_WORKSPACE` when the MCP diagnostic launcher starts from another runtime root.
  - Track MCP capability as `observed` or `unknown` and keep hook-driven CLI fallback non-executing.

## 0.3.1

### Patch Changes

- f1db710: Kibi check outputs now have a stable advisory diagnostics lane for auditability review signals. Operators and MCP clients can receive `qualityDiagnostics` alongside hard `violations` without advisory-only findings changing pass/fail counts or exit behavior. Existing staged impact failures, including symbol granularity violations, remain blocking. Source impact analysis now also highlights overly broad symbols, indistinguishable symbol coordinates, and mixed-purpose component/class ownership as review-only guidance.

  Technical summary:

  - Add the public `QualityDiagnostic` type with `error`, `warning`, `review`, and `info` severities plus explicit `blocking` semantics.
  - Preserve existing `violations`, `diagnostics`, and `impactDiagnostics` fields while adding MCP structured `qualityDiagnostics` output support.
  - Preserve explicitly filtered MCP `kb_check` rule semantics so advisory full-KB quality scans only run for unfiltered checks or requested impact diagnostics.
  - Clarify Codex and Cursor bundled agent guidance so targeted checks use explicit rules and final checks omit rules for full-KB `qualityDiagnostics` review.
  - Add quality diagnostic text formatting and shared blocking helpers that treat `blocking: true` or `severity: "error"` as hard failures.
  - Add non-blocking `multi_requirement_symbol_review`, `duplicate_symbol_coordinate_review`, and `component_mixed_purpose_review` impact diagnostics.

## 0.3.0

### Minor Changes

- Kibi now gives agents source-impact feedback while they are still editing, instead of waiting for the commit hook to be the first signal. Meaningful source edits can be checked through MCP with changed-file impact diagnostics, so agents see coarse symbol ownership, stale symbol evidence, and semantic-review prompts while the source context is fresh. OpenCode, Cursor, and Codex adapters now steer agents toward that MCP-first workflow and keep CLI/hooks as the later safety net.

  Technical summary:

  - Add reusable CLI changed-file impact diagnostics and export them for MCP consumption.
  - Extend MCP `kb_check` with source-file impact options and structured impact output.
  - Update OpenCode, Cursor, and Codex guidance/hooks to request impact-enabled `kb_check` after source edits.
  - Document semantic-review diagnostics and class-member granularity expectations.

## 0.2.2

### Patch Changes

- Kibi now gives agents clearer guidance for the diagnostics flow, so the release notes should reflect that the bundled usage text and MCP logging story were tightened together.

  This update also keeps the package mirrors aligned where applicable, which helps downstream plugin consumers stay in sync with the canonical guidance.

  - Hardened bundled skill guidance for kibi usage.
  - Improved MCP diagnostic logging shape and validation hints.
  - Synced packaged skill copies where they are shipped with the release.

## 0.2.1

### Patch Changes

- 5d2975a: Cursor stop hooks no longer inject a long multi-line Kibi freshness reminder after every agent response. Follow-ups are now one line, and most sessions stay silent.

  - Track `kb_upsert`, `kb_delete`, and `kb_check` MCP usage during the session.
  - Emit no stop follow-up when nothing KB-relevant changed, or when `kb_check` already ran after edits.
  - Emit a short summary (`Kibi KB updated (kb_upsert).`) after KB mutations, or a single-line sync nudge when source files changed without KB activity.
  - Fix publish workflow to build and pack `kibi-cursor` tarballs before npm publish.

- Cursor sessions now use Cursor's documented workspace root payload when deciding whether Kibi is already configured. This prevents the plugin from telling agents that Kibi needs bootstrapping just because the hook process is running from the plugin install directory instead of the actual workspace. The bootstrap reminder now names the missing `.kb/config.json` condition directly instead of implying MCP is unavailable.

  - Parse `workspace_roots` from Cursor hook payloads and prefer the first workspace root for Kibi config detection.
  - Add a regression test covering `sessionStart` without `cwd` when `workspace_roots` points at a configured workspace.
  - Reword the bootstrap reminder to describe a missing workspace config rather than generic initialization failure.

## 0.2.0

### Minor Changes

- Cursor users can now install an optional Kibi adapter plugin that bundles MCP configuration, workflow rules, skills, slash commands, and advisory editor hooks. The plugin builds on the existing `kibi-cli` and `kibi-mcp` foundation without replacing them, and teams that prefer manual setup can continue configuring the local `kibi-mcp` server directly.

  - Add the publishable `kibi-cursor` package with Cursor plugin manifest assets, rules, skills, commands, hook declarations, and MCP config.
  - Add advisory hooks for bootstrap reminders, direct `.kb` edit warnings, read/write guidance, and session freshness follow-ups.
  - Wire `kibi-cursor` into workspace build, pack, release-state, publish, CI unit coverage, docs, and marketplace verification.

## 0.1.0

### Minor Changes

- Cursor users can install an optional Kibi adapter plugin that bundles MCP configuration, workflow rules, skills, slash commands, and advisory editor hooks. The plugin builds on `kibi-core`, `kibi-cli`, and `kibi-mcp` without replacing them, and teams that prefer manual setup can continue configuring the local `kibi-mcp` server directly.

  - Add the publishable `kibi-cursor` package with Cursor plugin manifest assets, bundled skills, rules, commands, hook declarations, and MCP config.
  - Add a conservative hook runner with bounded session state, bootstrap reminders, direct `.kb` edit warnings, read/write guidance, and freshness follow-ups.
  - Wire `kibi-cursor` into workspace build, pack, release-state, publish, CI unit coverage, docs, and marketplace verification.
