# kibi-cursor

## 0.5.1

### Patch Changes

- 5e4e126: Agents no longer treat Kibi's CLI as an MCP fallback. MCP tools and the trusted project-local CLI are presented as peer surfaces over the same 18 operations, and agent guidance now selects whichever interface is visible and approved in the current environment. The CLI's `--input` JSON routes remain first-class for agent automation, with no preference order implied.

  - Reframe `kibi-usage` Interface Selection and the operation-access preference column to peer surfaces.
  - Update OpenCode prompt injection, enforcement, and init-kibi guidance.
  - Update the MCP init-kibi prompt and the staged-impact evidence resolution text.
  - Re-sync the Cursor and Codex skill bundles.

- Codex and Cursor users now receive the same verified prose-to-logic guidance as the Kibi CLI. The bundled `kibi-usage` skill explains proposition coverage, typed Logic IR safety, predicate recovery, and contradiction-aware validation without relying on repository-specific release conventions.

  - Synchronize the Logic IR, fact-lane, workflow, and portable skill guidance into both agent bundles.
  - Keep the bundled skill manifests and canonical hashes aligned with the CLI public skill.

- 5e4e126: Kibi now ships as a portable Agent Plugin alongside the existing Cursor Plugin. The open Agent Plugins standard (agent-plugins.org) packages Kibi's Agent Skills and MCP server so any compatible client — Cursor, Copilot, OpenCode, and others — loads Kibi's capabilities without client-specific adaptation. The Cursor Plugin keeps Cursor-only components (rules, commands, hooks), and both formats are listed in the same marketplace.

  - Add a committed portable Agent Plugin artifact at `agent-plugin/` with a conformant `plugin.json` manifest (plugin.schema.json 1.0.0).
  - Generate the artifact's `mcp.json` with the required `$schema` and `stdio` server type.
  - List the Agent Plugin (`plugins/kibi-agent-plugin`) in the repo marketplace alongside `kibi-cursor`.
  - Add `scripts/build-agent-plugin.ts` to regenerate the artifact and keep its skills in sync with the canonical bundle.

- 2a85fc8: Kibi can now track whether every atomic clause in a normative requirement has a queryable logical representation. Readable prose remains intact, while stable claim keys, linked strict-property or predicate facts, and a requirement manifest expose incomplete modeling before it silently weakens contradiction detection. Exact opposite polarities over the same ground predicate now produce a contradiction.

  - Remove repository-specific release and optimizer-corpus text from `kibi-usage`.
  - Add portable clause-complete prose-to-ground-predicate/property guidance and examples.
  - Preserve logical claim and predicate-schema fields through Markdown sync.
  - Add semantic-advisor clause inventories, merged claim manifests, and the `logic-coverage` check.
  - Enable manifest validation by default and report every current unmanifested requirement as explicit backfill debt.
  - Detect exact `assert`/`deny` conflicts over the same ground predicate.
  - Normalize trailing clause punctuation so formatting variants share one claim identity.
  - Enforce a one-claim/one-ground-fact mapping and reject duplicate logical terms masquerading as separate coverage.
  - Preserve every target when exact query results contain repeated relationship types.
  - Keep semantic-advisor readiness partial until every normative claim has a distinct logical grounding slot.
  - Drain machine-readable CLI output before the explicit process exit so large results are complete without leaving runtime handles alive.
  - Preserve and enforce claim-key patterns, uniqueness, and paired provenance through MCP schema registration.
  - Synchronize the corrected skill into the Codex and Cursor bundles.

- 2f9073c: Kibi now ships optional guidance for recording UI and visual expectations, so agents working on a screen can discover "where things live" and cannot silently drift the layout. A prose requirement anchors the full visual description, checkable positions, alignment, and header ordering decompose into strict facts that reject conflicting writes, and relational alignment uses the built-in `visual_layout_rule` predicate. The lane is per-project: non-UI projects simply never model UI subjects, and no validation rule requires them.

  Also, `kb_status` within a long-lived MCP session now observes same-session file and KB changes instead of returning a stale cached result. Compound Prolog goals (such as the status query) are no longer cached in one-shot mode, so a status check after a source or documentation edit reports the current freshness state.

  - Add `docs/ui-requirements.md` with the three-layer UI modeling guide, payload-shaped examples, and the check workflow.
  - Point the modeling cheatsheet decision tree, agent LLM rules, and the AGENTS quick references at the new UI lane.
  - Add a self-contained `kibi-usage` skill resource (`resources/ui-requirements.md`), declare it in the skill manifest, and add a UI modeling workflow section.
  - Synchronize the updated `kibi-usage` skill into the Codex and Cursor bundles.
  - Keep compound Prolog goals out of the one-shot query cache so `kb_status` reports fresh state after same-session writes.

## 0.5.0

### Minor Changes

- b2b1792: Kibi guidance now helps agents distinguish suitable relational predicates from scalar constraints and review-only claims without replacing readable requirements. CLI, Codex, and Cursor users receive the same predicate-first decision tree and authoritative examples, reducing invented predicates and unsafe modeling.

  - Add built-in, project-local, deny, strict-scalar, ambiguity, false-positive, and ontology-gap guidance to the canonical `kibi-usage` skill.
  - Regenerate the Codex and Cursor mirrors with matching canonical hashes.

### Patch Changes

- 610b5be: The improved Kibi guidance skills will ship to CLI, Codex, and Cursor users in the next package release. This keeps the canonical CLI skill bundle and the generated client-plugin mirrors aligned for downstream installs.

  - Release the canonical skills bundled by `kibi-cli`.
  - Release the generated `kibi-codex` and `kibi-cursor` skill mirrors.

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
