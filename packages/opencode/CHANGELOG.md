# kibi-opencode

## 0.19.2

### Patch Changes

- 5e4e126: Agents no longer treat Kibi's CLI as an MCP fallback. MCP tools and the trusted project-local CLI are presented as peer surfaces over the same 18 operations, and agent guidance now selects whichever interface is visible and approved in the current environment. The CLI's `--input` JSON routes remain first-class for agent automation, with no preference order implied.

  - Reframe `kibi-usage` Interface Selection and the operation-access preference column to peer surfaces.
  - Update OpenCode prompt injection, enforcement, and init-kibi guidance.
  - Update the MCP init-kibi prompt and the staged-impact evidence resolution text.
  - Re-sync the Cursor and Codex skill bundles.

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

- Updated dependencies [5e4e126]
- Updated dependencies [6d66110]
- Updated dependencies [750ff49]
- Updated dependencies [2a85fc8]
- Updated dependencies [a28d325]
- Updated dependencies [38f72bf]
- Updated dependencies [2d93976]
- Updated dependencies [2f9073c]
- Updated dependencies [a52b592]
  - kibi-cli@0.17.0

## 0.19.1

### Patch Changes

- Updated dependencies [80d5173]
- Updated dependencies
- Updated dependencies
- Updated dependencies [b2b1792]
- Updated dependencies [610b5be]
  - kibi-cli@0.16.0

## 0.19.0

### Minor Changes

- a0fee4a: OpenCode plugin guidance now describes MCP and CLI as peer surfaces. Agents can select the available trusted capability while preserving the same discovery, mutation, and validation workflow.

  - Document visible MCP tools and trusted project-local CLI JSON routes as equivalent operation surfaces.
  - Keep the blocked-state guidance when neither safe interface is available.

### Patch Changes

- 23e815a: Agents can now keep using Kibi when MCP tools are unavailable but a trusted project-local CLI is ready. Guidance across Cursor, OpenCode, and MCP documentation now selects the interface by capability and stops for operator action only when neither safe surface is available.

  - Replace MCP-exclusive guidance with the visible-MCP, trusted-CLI JSON route, and blocked state machine.
  - Preserve direct `.kb/` access prohibitions, discovery-before-mutation, sequential writes, and completion validation gates.

- 0a8a5d3: CLI and MCP users now receive real requirement-modeling and predicate-suggestion plans through the same shared operation executors. Prolog-backed status and reports work reliably again, nested skill commands accept JSON input, and compatibility errors no longer block parity verification.

  - Move modeling execution into `kibi-cli` and keep MCP handlers as thin adapters.
  - Split modeling internals into reviewable modules and use the operation workspace context for migration checks.
  - Restore compatible Prolog query, validation, deletion, and error behavior.
  - Align the MCP dependency range with the released CLI version and remove silent OpenCode catches.

- Updated dependencies [6abc7ea]
- Updated dependencies [212fe1c]
- Updated dependencies [8c3a2e9]
- Updated dependencies [6c132ee]
- Updated dependencies [cafa25f]
- Updated dependencies [0a8a5d3]
- Updated dependencies [212fe1c]
- Updated dependencies [a0fee4a]
- Updated dependencies [c229a35]
- Updated dependencies [6c132ee]
- Updated dependencies [212fe1c]
- Updated dependencies [6c132ee]
- Updated dependencies [efa3c7e]
  - kibi-cli@0.15.0

## 0.18.1

### Patch Changes

- da91ada: OpenCode guidance now emits safer Kibi impact-check snippets for edited source paths and cleaner advisory diagnostics during background maintenance. Paths with quotes or other JSON-sensitive characters are escaped correctly, and advisory failures stay focused on actionable Kibi review work instead of noisy implementation detail.

  - JSON-escape edited source paths before embedding them in `kb_check` guidance.
  - Clean advisory diagnostic handling in the OpenCode sync scheduler.
  - Add regression coverage for source-path escaping and advisory diagnostic quality.

- Updated dependencies [6830005]
- Updated dependencies [c7126dd]
- Updated dependencies [da9da64]
  - kibi-cli@0.14.1

## 0.18.0

### Minor Changes

- f1db710: OpenCode background checks now surface advisory Kibi quality diagnostics without turning a clean check into an operational plugin failure. Users get concise structured maintenance logs for review-only findings while hard `kibi check` violations keep the existing failure behavior and exit status. The CLI check command also exposes a JSON format so background integrations can consume the same structured diagnostics reliably.

  Technical summary:

  - Add `kibi check --format json` output with `structuredContent.violations`, `count`, `diagnostics`, and `qualityDiagnostics`.
  - Run OpenCode targeted background checks with JSON output and parse non-blocking `qualityDiagnostics` on successful checks.
  - Log advisory diagnostic summaries through structured warning logs, preserving terminal silence and existing hard check failure routing.

### Patch Changes

- Updated dependencies [48b65b9]
- Updated dependencies [f1db710]
- Updated dependencies [f1db710]
- Updated dependencies [439cb2e]
- Updated dependencies [f1db710]
- Updated dependencies [cb8d977]
- Updated dependencies [224f18b]
  - kibi-cli@0.14.0

## 0.17.0

### Minor Changes

- Kibi now gives agents source-impact feedback while they are still editing, instead of waiting for the commit hook to be the first signal. Meaningful source edits can be checked through MCP with changed-file impact diagnostics, so agents see coarse symbol ownership, stale symbol evidence, and semantic-review prompts while the source context is fresh. OpenCode, Cursor, and Codex adapters now steer agents toward that MCP-first workflow and keep CLI/hooks as the later safety net.

  Technical summary:

  - Add reusable CLI changed-file impact diagnostics and export them for MCP consumption.
  - Extend MCP `kb_check` with source-file impact options and structured impact output.
  - Update OpenCode, Cursor, and Codex guidance/hooks to request impact-enabled `kb_check` after source edits.
  - Document semantic-review diagnostics and class-member granularity expectations.

### Patch Changes

- Updated dependencies
  - kibi-cli@0.13.0

## 0.16.0

### Minor Changes

- 7a5639f: OpenCode users now get the latest compatible Kibi plugin automatically on startup. This keeps prompt guidance and background maintenance fixes current without requiring users to manually clear OpenCode's plugin cache. Projects that need a fixed plugin can pin an exact semver entry such as `kibi-opencode@0.15.0`, and the updater will respect it.

  - Add a startup auto-updater for the cached `kibi-opencode` OpenCode plugin package.
  - Add `autoUpdate` plugin config, defaulting to `true`, with `false` disabling the updater.
  - Respect exact semver pins in the OpenCode `plugin` array while leaving `kibi-cli`, `kibi-mcp`, and `kibi-core` untouched.

## 0.15.4

### Patch Changes

- 4612928: Clarify that the OpenCode plugin is optional and does not replace the base Kibi CLI or MCP server packages. Users should install and configure `kibi-cli`, `kibi-mcp`, and `kibi-core` in their project first, then add `kibi-opencode` only when they want OpenCode-specific guidance and background maintenance.

  - Document project-local package-manager execution separately from plugin loading.
  - Clarify that the plugin expects the project-local `kibi` CLI to be resolvable for internal maintenance.

- Updated dependencies
  - kibi-cli@0.12.3

## 0.15.3

### Patch Changes

- 8b73781: Bootstrap guidance is now easier for agents to apply correctly in OpenCode. The `/init-kibi` workflow and bundled Kibi usage skill explain that OpenCode can expose canonical `kb_*` MCP tools with a `kibi_` server prefix, and autopilot bootstrap output now includes an explicit `applyPlan` so agents can preview exact writes before asking for approval.

  - `kibi-mcp`: expose aggregate `structuredContent.applyPlan`/top-level `applyPlan` from `kb_autopilot_generate`, preserve `/init-kibi` as a post-hoc bootstrap prompt, mention it in visible output, and advertise typed fact fields in the `kb_upsert` input schema.
  - `kibi-opencode`: document the OpenCode `kibi_kb_*` tool-name convention in `/init-kibi` alias guidance and README.
  - `kibi-cli`: update the bundled `kibi-usage` skill with host-prefix guidance for OpenCode users.

- Updated dependencies [8b73781]
- Updated dependencies [35f3944]
  - kibi-cli@0.12.2

## 0.15.2

### Patch Changes

- Updated dependencies
  - kibi-cli@0.12.0

## 0.15.1

### Patch Changes

- OpenCode users no longer receive automatic or manual Kibi brief delivery from the plugin. Prompt guidance, background sync, smart enforcement, and KB freshness reminders remain available without brief generation, brief toasts, or brief TUI routes. This reduces noisy single-file briefing behavior while preserving the core Kibi guidance loop.

  Technical summary:

  - Regenerate OpenCode dist after removing idle, prompt, and TUI briefing paths.
  - Keep non-brief prompt guidance and sync/check functionality intact.

- Updated dependencies
  - kibi-cli@0.11.3

## 0.15.0

### Minor Changes

- 818858d: OpenCode sessions now surface a visible KB freshness status when source, test, or documentation changes leave the Kibi knowledge base unresolved. The plugin detects meaningful changes and requires agents to resolve KB impact as updated, no-impact with rationale, or deferred before completion. No new public commands were added — all enforcement uses existing MCP tools and the existing `kibi check --staged` hook boundary.

  ***

  - feat: add internal KB freshness state machine and evidence store (kibi-opencode)
  - feat: add meaningful-change classifier to distinguish source/document edits from lockfiles and build artifacts
  - feat: extend enforcement policy to accept structured KB freshness evidence in checkpoint evaluation
  - feat: wire tool-event observation and freshness evaluation into the OpenCode plugin lifecycle
  - feat: surface visible `🧠 **Kibi freshness required**` block when KB impact is unresolved
  - test: add staged-impact-contract test coverage for pre-commit hook backstop

### Patch Changes

- 4aa9830: Kibi now has a reusable markdown skill subsystem across CLI, MCP, and OpenCode. The CLI exposes bundled skills with manifest validation and safe resource loading. The MCP server provides progressive-disclosure tools (`kb_skills_list`, `kb_skills_load`, `kb_skills_read`) for agents to discover and read skills without starting Prolog or touching the KB. OpenCode routes its guidance through the `kibi-usage` skill, giving agents a single source of truth for Kibi usage patterns. An official `kibi-usage` skill bundle ships with all three packages, covering fact lanes, relationship directions, and canonical workflows.

  - feat(cli): add markdown skill loader with manifest types, validation errors, secure path/resource validation, and size limits
  - feat(cli): expose `kibi-cli/skills` public export with `skills list`, `skills load`, `skills read`, `skills validate`
  - feat(mcp): add `kb_skills_list`, `kb_skills_load`, `kb_skills_read` tool definitions, handlers, runtime wiring, and docs rendering
  - feat(mcp): resolve bundled skills from packaged source assets when running from compiled CLI output
  - feat(opencode): route agent guidance through `kibi-usage` skill, add `kb_skills_load` to tool listings
  - docs: add official `kibi-usage` skill with fact lanes, relationship directions, and workflow guidance
  - test: add mock-free MCP handler tests against real bundled `kibi-usage` skill, including invalid skill and resource errors
  - test: add CLI skill unit coverage for valid bundles, validation errors, traversal/symlink escapes, oversize limits

- b5c53ad: OpenCode users will now see reliable Kibi package versions in the startup toast regardless of whether the plugin is loaded from a repo-local copy or an installed package. The toast now displays opencode, mcp, cli, and core versions alongside structured logging. A 3-tier runtime resolver gracefully handles any resolution mode without throwing.

  ***

  - feat: embed package version metadata into dist/version-metadata.json at build time
  - feat: display kibi-opencode, kibi-mcp, kibi-cli, and kibi-core versions in startup toast
  - feat: add 3-tier runtime resolver (generated-dist, workspace-packages, unknown) that never throws
  - feat: include structured version metadata and unknownVersions in startup log body

- Updated dependencies [4aa9830]
  - kibi-cli@0.11.1

## 0.14.0

### Minor Changes

- 5d1bd5a: OpenCode guidance now uses one lifecycle enforcement policy for created, edited, and deleted relevant files. In hard mode, authoritative Kibi roots get a single aggregated checkpoint block that tells agents exactly which MCP tools to use before continuing, including sourceFile cleanup guidance for deleted files with no linked IDs.

  Technical summary:

  - Add a pure enforcement-policy module with advisory, hard-block, skip, and checkpoint-passed decisions.
  - Route file-operation reminders through the policy and cover edited-file, deletion, non-authoritative, and aggregation cases with focused tests.

- 2ee60fc: OpenCode hard enforcement can now complete a plugin-owned checkpoint instead of relying on prompt guidance alone. Authoritative roots only pass when the exact dirty fingerprint has rendered hard guidance and the internal Kibi sync/check cycle succeeds; degraded authoritative roots fail closed with restoration guidance while non-authoritative roots continue to skip hard enforcement.

  Technical summary:

  - Add a hard Kibi checkpoint runner with scoped in-memory evidence, scheduler flush coordination, targeted-check validation, and 30-second timeout handling.
  - Cover pass, sync failure, check failure, timeout, degraded, non-authoritative, and fingerprint-isolation behavior in opencode scheduler tests.

### Patch Changes

- 882017f: OpenCode hard mode now surfaces a clear stop-state in the prompt when authoritative files are dirty and the Kibi checkpoint has not been satisfied. Agents see deterministic MCP-only recovery steps instead of advisory guidance, while non-authoritative workspaces continue without a hard block.

  Technical summary:

  - Add hard-gate prompt rendering with bounded affected paths and public MCP tool instructions.
  - Thread hard-mode file-operation policy results through the plugin prompt transform and preserve non-authoritative skip behavior.
  - Cover hard-block and no-block behavior in prompt and hook contract tests.

- 1ff797b: The kibi-opencode README now fully documents the three smart-enforcement modes so users can choose the right posture for their workflow. This repository's dogfood configuration has also switched to `hard` mode, which means authoritative roots and linked git worktrees will fail closed until the Kibi checkpoint passes.

  Technical summary:

  - Document `advisory`, `strict`, and `hard` modes in the Smart Enforcement section with authoritative-root and linked-worktree fail-closed semantics.
  - Update the config keys table to list `advisory`, `strict`, and `hard` as valid values for `guidance.smartEnforcement.mode`.
  - Update the Hook Policy section to clarify that enforcement is advisory by default with opt-in strict and hard modes available.
  - Change `.opencode/kibi.json` dogfood config from `mode: "advisory"` to `mode: "hard"`.

## 0.13.0

### Minor Changes

- ba9da28: Users now automatically receive rich, semantic briefs when they modify knowledge base entities through MCP tools. Instead of seeing only file names and timestamps, briefs now tell a clear story about what changed—like "Requirement AUTH-001 was superseded by AUTH-002"—making it easier to understand the impact of KB updates and track knowledge evolution across branches.

  - **kibi-mcp**: `kb_upsert` and `kb_delete` now write brief-pending markers to `.kb/briefs/pending/` on successful mutation.
  - **kibi-opencode**: Added idle handler that consumes pending markers, graph-narrative engine for inferring semantic stories, and enhanced brief generation with user-centric narratives (headline, domain changes, relationship changes). TUI delivery shows "Kibi Knowledge Update" toast.

### Patch Changes

- f8a3a88: This update introduces a split symbol coordinate workflow that separates logical symbol definitions from their physical source locations. Symbol coordinates are now managed in `documentation/symbol-coordinates.yaml`, which improves git diff readability and reduces merge conflicts when only line numbers change. The `kibi sync` command now supports a `--refresh-symbol-coordinates` flag to explicitly update these locations.

  - **kibi-cli**: Added `--refresh-symbol-coordinates` flag to `kibi sync` and updated pre-commit hooks to enforce coordinate staging.
  - **kibi-mcp**: Updated symbol resolution logic to read from the new split coordinate manifest.
  - **kibi-opencode**: Updated background sync behavior and documentation to support the split manifest workflow.
  - **kibi-vscode**: Updated the symbol resolver to consume the split `symbol-coordinates.yaml` file for navigation and hover features.

- Updated dependencies [f8a3a88]
- Updated dependencies [d783b67]
  - kibi-cli@0.11.0

## 0.12.1

### Patch Changes

- 0d998ad: **Behavior-changing source edits now require Kibi impact evidence before commit.**

  The `kibi check --staged` command now enforces a hard gate: behavior-changing source edits must be accompanied by staged Kibi impact evidence (KB entity documentation or refreshed `documentation/symbols.yaml`). This prevents commits that change behavior without updating the knowledge base.

  **New diagnostics:**

  - `kibi_impact_evidence_missing` — emitted when behavior source edits lack staged KB evidence
  - `symbols_manifest_stale` — emitted when source edits alter symbol coordinates but the staged manifest is missing or stale

  **What this means for users:**

  - If you change behavior-bearing source code, stage relevant KB entity markdown or refresh `documentation/symbols.yaml`
  - Test-only edits (`tests/`, `*.test.*`) and docs-only edits (`.md`) are exempt
  - The no-impact override is available only for classifier false positives, not genuine behavior changes

  **OpenCode guidance updated** to remind agents that Kibi impact evidence is required before completion/commit.

  **Technical changes:**

  - Added `packages/cli/src/traceability/evidence-model.ts` — typed Kibi impact evidence interfaces
  - Added `packages/cli/src/traceability/staged-diagnostics.ts` — `collectStagedKibiDiagnostics()` with stable diagnostic IDs
  - Added `packages/cli/src/traceability/staged-impact-contract.ts` — behavior classification and evidence parsing
  - Added `packages/cli/src/traceability/staged-symbols-manifest.ts` — stale manifest detection
  - Extended `packages/cli/src/commands/check.ts` staged path to evaluate impact evidence
  - Updated pre-commit hook comments and contributor docs

- 4557485: OpenCode users can now see which kibi-opencode version started because the startup toast includes the version when available. This helps confirm local dogfood or package wiring after upgrades, making it immediately obvious if an older version is still running.

  - Pass the kibi-opencode package version into startup notification config.
  - Append the version to the startup toast message when available.
  - Cover version-present and version-absent paths in startup notifier tests.

- Updated dependencies [0d998ad]
  - kibi-cli@0.10.1

## 0.12.0

### Minor Changes

- 5f715a5: Kibi now automatically respects your repository's `.gitignore` rules during knowledge base discovery. Files ignored by Git — as well as tool directories like `.sisyphus` and `.opencode` — are no longer treated as domain knowledge sources. This prevents draft and build artifacts from polluting your knowledge base.

  - Added documentation describing the repository ignore policy and hard-denied directories.
  - Clarified that Kibi honors repository `.gitignore`, nested `.gitignore`, and `.git/info/exclude` during `kb_autopilot_generate`, briefing generation, and discovery.
  - Documented that global Git excludes are not honored in v1, and that automatic cleanup of previously-discovered KB entities is out of scope for this release.
  - Integrated a note about ignore-aware file-event skipping in the OpenCode plugin README.

### Patch Changes

- Updated dependencies [5f715a5]
  - kibi-cli@0.10.0

## 0.11.1

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies
  - kibi-cli@0.9.0

## 0.11.0

### Minor Changes

- 4746f3f: Briefs no longer surface internal task-tracking artifacts (such as `.sisyphus/boulder.json`) as if they were meaningful project knowledge. Notifications are now specific-or-silent: a toast only appears when the brief can say what changed and why it matters. Previously, any `.sisyphus/` file edit could trigger a brief with generic content and produce a vague "a brief is available" notification regardless of whether it contained real domain context.

  - `kibi-cli`: adds `isOperationalArtifactPath(pathLike)` helper, exported as `kibi-cli/operational-artifacts`, matching `.sisyphus/**` paths as operational task-tracking artifacts
  - `kibi-mcp`: filters operational artifact sources, entities, and citations before brief content is assembled so `.sisyphus/**` changes never appear in brief entities, citations, prompt blocks, or TLDRs
  - `kibi-opencode`: suppresses brief eligibility for operational-only source changes; adds specificity gate to toast delivery so generic/operational envelopes do not trigger notifications
  - `kibi-vscode`: applies same specific-or-silent semantics to VS Code brief watcher so generic/operational envelopes do not call `showInformationMessage`

### Patch Changes

- 2dd07e5: OpenCode bootstrap command support is now more reliable in fresh CI and Bun installations. The plugin can detect native `/init-kibi` command support when OpenCode installs the SDK as a transitive dependency of the plugin, preventing supported hosts from silently falling back to the namespaced MCP prompt.

  - Resolve `@opencode-ai/sdk` metadata from Bun's plugin-sibling dependency layout during native command capability detection.
  - Add regression coverage for the transitive SDK resolution path used by fresh installs.

- b62a9a8: OpenCode sessions are now more resilient to transient background failures and idle timeouts. The plugin automatically suppresses repetitive background sync attempts after a persistent failure is detected, while ensuring manual developer actions still trigger fresh attempts to recover.

  - Implement background sync suppression after latched operational failures to prevent log noise during idle periods.
  - Add diagnostic metadata to sync failure payloads for improved observability.
  - Ensure manual edits and tool executions bypass idle suppression to allow for graceful recovery.
  - Restore standard operational sync behavior once the workspace state is resolved.

- 2a00e15: Kibi discovery is now less noisy for broad agent queries. When agents send multi-intent natural-language searches, targeted domain-specific entities now rank above unrelated generic results. No-signal queries (containing only common stop words) return an empty result instead of arbitrary token-coverage matches. OpenCode agents are now guided to decompose broad queries into focused probes and follow up with exact `kb_query` lookups.

  - `kibi-cli`: Add stop-word filtering, hyphen normalization, plural normalization, and minimum-score threshold to `search-ranking.ts`; add synthetic regression corpus tests.
  - `kibi-mcp`: Add wrapper-level regression tests asserting improved ranking is preserved end-to-end.
  - `kibi-opencode`: Update injected agent guidance to instruct query decomposition with concrete examples.

- c06b245: Kibi brief toasts now show the specific entity-level knowledge base changes that triggered the notification (e.g. "Added requirement REQ-009", "Modified fact FACT-002") instead of a generic "Why it matters" message that always read the same. Toast and full brief now come from the same persisted reason data so the brief is always a deeper view of the same content surfaced by the toast. Automatic zero-change notifications are now suppressed — Kibi will not send a "Knowledge Update" toast or brief when no meaningful entity changes, validations, or briefing impacts occurred. The `kibi-brief` command is now available as a TUI alias to open the latest full brief without typing the full route.

  - Persist `deliveryReasons` model on brief envelopes to support unified rendering.
  - Consolidate toast and full brief content generation from a single source of truth.
  - Implement zero-change suppression logic in `generateIdleBrief` and `announceBriefTui` to eliminate redundant notifications.
  - Register `kibi-brief` TUI alias for direct access to the latest briefing output.

- Updated dependencies [4746f3f]
- Updated dependencies [7880675]
- Updated dependencies [2a00e15]
- Updated dependencies [8d8ebf6]
  - kibi-cli@0.8.0

## 0.10.0

### Minor Changes

- b9ef9a2: Add shared brief configuration defaults for automatic TUI delivery across Kibi clients. The CLI now reads and exposes brief config from `.kb/config.json` with sensible boolean defaults (all enabled), the OpenCode plugin delivers idle brief summaries via toast notification with automatic prompt append and auto-submit, and the VS Code extension gates notifications by the shared brief policy. This provides a unified, zero-config experience for teams using multiple Kibi clients.
- 736f675: Add the interactive cold-start bootstrap flow and its regression coverage so the public MCP surface, OpenCode prompt wiring, and extractor exports stay in sync.
- 3dd2c56: Document the native `/init-kibi` alias as a thin OpenCode UX wrapper over the existing MCP bootstrap workflow. When the plugin supports native command injection, `/init-kibi` is the canonical short alias; `/kibi:init-kibi:mcp` remains the namespaced fallback, and unsupported hosts fail closed with explicit guidance instead of pretending the alias exists.

### Patch Changes

- a1a198b: Add configurable idle-brief delay and retention policies in shared `.kb/config.json` (`briefs.tui.idleDelayMs` and `briefs.retention.*`). OpenCode now applies retention garbage collection after brief writes and prunes stale `.tui-seen` hashes for briefs that were deleted by retention.
- 699a482: Create append-only contract documentation and release metadata for the Kibi briefing schema-2.0 session-delta migration. This update introduces high-fidelity change tracking anchored to the session start, prioritized change narratives for MCP-cited entities, and deterministic filename-based brief selection for VS Code.
- efdacbc: Session-local baseline counts, semantic content-hash dedupe, compact promptBlock fallback, richer envelope fields, and VS Code popup-first UX. The OpenCode plugin now scopes audit deltas to the current session instead of cumulative branch totals, deduplicates briefs by normalized visible-content hash rather than briefId, and surfaces constraints, regression risks, and missing evidence in the envelope. The MCP server gracefully degrades the prompt block with compact truncation instead of returning empty content when over budget.
- 7bcd57e: Improve idle-brief delivery timing and deduplication across OpenCode TUI and VS Code channels. The OpenCode plugin now syncs before idle briefing, waits for the idle work burst to settle, handles sync-only KB changes, and persists TUI-seen brief hashes so delivered briefs do not replay after restart while VS Code can still receive unread brief files.
- 3aad975: Document render-first idle briefing behavior and mark deprecated config keys. The OpenCode and VS Code READMEs now reflect the shift from notification-based delivery to render-first briefings. Several legacy configuration knobs (`briefs.tui.toast`, `briefs.tui.appendPrompt`, `ux.briefs.autoSubmit`) are now marked as deprecated/no-op for idle rendering while remaining parseable for compatibility. Shared channel gating in `.kb/config.json` remains the authoritative source of truth.
- 4000488: Improve briefing reliability for programmatic file edits by adding session-delta reconciliation. The plugin now detects risky edits via both the `file.edited` event fast-path and a prompt-cycle fallback that reconciles the current session scope before building guidance. This ensures briefings are available even when programmatic Edit/Write tools bypass the host event bus.
- 4fe5c7e: Fix OpenCode toast delivery and structured logging behavior:

  - Remove raw HTTP `fetch()` fallback to `/tui/show-toast` and all associated `[KIBI-TRACE]` console.error noise from the toast transport path.
  - Repair `sendToast()` to use the official OpenCode SDK contract: prefers legacy `client.tui.toast(payload)` when available, otherwise uses `client.tui.showToast({ body: payload })`.
  - Add discriminated `SendToastResult` union (`delivered`, `unavailable`, `failed`) for explicit, testable toast outcomes.
  - Fix `makeToastClient()` to preserve bound TUI methods (`toast` and `showToast`) so `this` context is not lost.
  - Synchronize logger contract: `info()` and `warn()` remain terminal-silent even when `client.app.log()` rejects; `error()` emits exactly one prefixed `console.error` without secondary spam from structured log rejection.
  - Update startup notifier to log truthful structured outcomes (`startup toast delivered`, `startup toast unavailable`, `startup toast delivery failed`) instead of `result: String(undefined)`.
  - Remove `serverUrl` parameter from toast call chains and `PluginInput` interface.
  - Add regression coverage at unit level (`packages/opencode/tests/toast.test.ts`) and built-artifact level (`documentation/tests/e2e/opencode-plugin-local.test.ts`).
  - Update README and DEV.md to document the repaired toast and logging contracts.

- Improve user-facing briefing delivery to emphasize domain-impact prose over operator metadata. This removes low-value sections (session/unread/next-step style cues), introduces consistent narrative sections (what changed, why it matters, project knowledge impact), and updates TUI/VSCode rendering to keep interpretation notes descriptive rather than directive.
- Updated dependencies [b9ef9a2]
- Updated dependencies [7ed9f0c]
- Updated dependencies [a1a198b]
- Updated dependencies [736f675]
  - kibi-cli@0.7.0

## 0.9.0

### Minor Changes

- 2bd0804: Kibi can now generate citation-backed start-task briefings through MCP with `kb_briefing_generate`, making it easier for agents to begin risky work from source-linked project context.

  OpenCode now surfaces that workflow through `/brief-kibi`, so teams can trigger the same Kibi briefing path directly from the editor before acting.

- f9258c6: OpenCode now auto-fetches Kibi briefings from the event path when authoritative risky edits are detected. Ready-state briefings appear in a toast notification and inside the agent guidance block (headed `🧠 **Kibi briefing available**`). The `/brief-kibi` manual command remains available as a fallback.

## 0.8.0

### Minor Changes

- Kibi can now generate citation-backed start-task briefings through MCP with `kb_briefing_generate`, making it easier for agents to begin risky work from source-linked project context.

  OpenCode now surfaces that workflow through `/brief-kibi`, so teams can trigger the same Kibi briefing path directly from the editor before acting.

## 0.7.2

### Patch Changes

- 2066a48: Add init-kibi autopilot generation workflow

  - New MCP tool `kb_autopilot_generate` for read-only candidate generation
  - Activation-state classification and source discovery helpers
  - Deterministic candidate generation for Kibi docs and symbol manifests
  - Conservative generic markdown heuristics for ADR/REQ/FACT candidates
  - Dedupe logic and payoff summary reporting
  - Aligned OpenCode prompt guidance with activation workflow

## 0.7.1

### Patch Changes

- 0ec1cb1: Realign release metadata with the traceability schema update so all publishable packages carry the same patch release notes.
- 4a74281: Enable `noUncheckedIndexedAccess` incrementally across the source packages and add explicit guards where CLI parsing and traceability helpers read indexed values.
- 0ec1cb1: fix(opencode): respect absolute configured KB doc roots in bootstrap detection

  - Treat absolute `paths.*` entries in `.kb/config.json` as authoritative when checking whether a workspace is bootstrapped.
  - Add a regression test covering healthy absolute custom doc roots while preserving the existing missing-target bootstrap warning.

- 0ec1cb1: fix(cli): restore prolog codec exports

  - Regenerate the checked-in `src/prolog/codec.js` artifact so `toPrologString` and `toPrologAtom` are available as named exports at runtime, fixing CLI traceability test imports.

- de5dbaf: Enable `exactOptionalPropertyTypes` across source packages and tighten optional property handling in exported type surfaces.

## 0.7.0

### Minor Changes

- Prepare fresh minor release line for schema and traceability alignment

  This release includes the completed traceability schema realignment work,
  ensuring proper symbol-to-requirement linking, staged traceability checks,
  and the updated release automation model.

## 0.6.1

### Patch Changes

- 6cdf9f5: Realign release metadata with the traceability schema update so all publishable packages carry the same patch release notes.
- d344f57: fix(opencode): respect absolute configured KB doc roots in bootstrap detection

  - Treat absolute `paths.*` entries in `.kb/config.json` as authoritative when checking whether a workspace is bootstrapped.
  - Add a regression test covering healthy absolute custom doc roots while preserving the existing missing-target bootstrap warning.

  fix(cli): restore prolog codec exports

  - Regenerate the checked-in `src/prolog/codec.js` artifact so `toPrologString` and `toPrologAtom` are available as named exports at runtime, fixing CLI traceability test imports.

## 0.6.0

### Minor Changes

- 0c2c1e7: feat(traceability): document comment-free test workflow with validation parity

  - Add relationship-first traceability guidance: prefer split semantics with `implements` for production ownership, `covered_by` for production coverage, and `executable_for` plus `verified_by`/`validates` for test identity and verification instead of relying only on inline `// implements REQ-xxx` comments
  - Document staged symbol traceability enforcement with both workflow paths: relationship-based (preferred) and comment-based (optional/backward-compatible)
  - Synchronize guidance across AGENTS.md, CLI reference, and LLM rules with the implemented policy
  - Staged enforcement now supports explicit KB relationships in addition to inline comments
  - Document scope boundary: automatic extraction of framework-specific `test()` or `it()` callbacks is out of scope for staged check

## 0.5.4

### Patch Changes

- c144ac2: Fix false bootstrap warnings for configured repos and add packed-artifact verification

  This release fixes the false "workspace needs Kibi bootstrap" warning that appeared for workspaces already configured with `.kb/config.json` pointing at relocated `kibi-docs/*` paths.

  **Bug fix:**

  - The `checkWorkspaceHealth` function now correctly reads `.kb/config.json` to determine expected directory paths, instead of using hardcoded `documentation/*` paths that caused false positives for relocated documentation setups.

  **Prevention:**

  - Added packed-artifact regression tests (`documentation/tests/e2e/packed/opencode-bootstrap-paths.test.ts`) that verify healthy relocated paths don't emit warnings and missing targets still emit exactly one real warning.
  - Added release-gate step in `.github/workflows/publish.yml` to validate the actual npm tarball behavior before publishing, preventing future source/dist/tarball drift.
  - Updated `test:e2e:local` to rebuild `packages/opencode/dist` before running tests, ensuring dogfood always uses fresh builds.

  **Troubleshooting:**

  - Added documentation for cache recovery in `docs/troubleshooting.md` and `packages/opencode/README.md`.
  - Users experiencing this issue should clear the stale plugin cache: `rm -rf "$HOME/.cache/opencode/node_modules/kibi-opencode" "$HOME/.cache/opencode/bun.lock"`

- Add source-linked micro-briefs and complete targeted-check routing for traceability and fact edits.

  - Source-linked guidance: when 1-3 concrete requirement links exist in `documentation/symbols.yaml`, risky code edits now prepend `- Existing Kibi links: REQ-...` to the contextual guidance block.
  - Targeted validation routing: `traceability_candidate` code edits schedule `symbol-traceability`, and fact KB-doc edits include `strict-fact-shape` alongside the standard structural checks.
  - Keeps the plugin advisory-only; all enforcement remains non-blocking in the editor.

- 49fcad9: Harden OpenCode smart enforcement with posture-aware guidance, deterministic risk routing, structured observability, and an explicit advisory-vs-hook boundary.

  - `kibi-opencode`: adds repo-posture detection, risky-edit classification, smart-enforcement cache/config, posture-aware prompt injection, effective-mode gating, single-block prompt budget, prompt-visible completion reminders, runtime maintenance overlay, selective event routing, and structured smart-enforcement logs.
  - `kibi-cli`: documents and tests hooks as the hard enforcement boundary while preserving branch/post-merge refresh behavior.
  - `kibi-mcp`: enriches diagnostic usage fields so rollout telemetry remains queryable without changing the public MCP surface.

## 0.5.3

### Patch Changes

- 6df5858: Fix workspace health check to honor configured Kibi sync and documentation paths from `.kb/config.json`, preventing false bootstrap warnings when documentation directories have been relocated.
- 051bdc3: Quieter terminal behavior and logging correctness improvements:

  - Normal-operation logs (`info`/`warn`) now route through structured `client.app.log()` instead of `console.log`/`console.warn`, silenced when no host client is available.
  - Error-class events (bootstrap-needed, sync/check failure, hook/init failure) remain visible in terminal via `console.error`.
  - All `client.app.log()` calls are now fire-and-forget with `.catch(console.error)` to prevent unhandled Promise rejections.
  - `PluginClient` interface is now exported so TypeScript declaration emit succeeds when `declaration: true`.
  - Logger client is reset at the start of each plugin invocation to prevent client state leaking across multiple in-process instantiations.
  - `system.transform` hook now appends only the guidance block to `output.system`, avoiding duplication of prior prompt entries.

## 0.5.2

### Patch Changes

- 7bd2adf: Internal code quality improvements and refactoring.

  - Deduplicate `splitTopLevel` into single canonical function in `codec.ts`.
  - Deduplicate `Violation`, `ChecksConfig`, and rule definitions between CLI and MCP.
  - Extract `safeCleanupProlog` helper to eliminate duplicated teardown patterns.
  - Replace `process.exit()` with return values in CLI command handlers.
  - Remove dead code (`target-resolver.ts`), annotate empty catch blocks, remove unreachable code paths.
  - Add `toPrologString` helper, `parseViolationRows`, export `splitTopLevelGeneral` from codec.
  - Clean narration comments across all packages.

- 7bd2adf: Add typed fact schema, semantic contradiction model, and discovery bundle tools.

  - **Typed facts**: New `fact_kind` field (subject, property_value, observation, meta) with schema validation, preserved through CLI/MCP sync and query round-trips.
  - **Discovery bundle**: `kb_search`, `kb_find_gaps`, `kb_coverage`, `kb_graph` tools across MCP and CLI. Richer `kb_check` summaries and improved diagnostic usage logging.
  - **Agent guidance**: Updated to prefer discovery-first workflows (`kb_search` → `kb_query`), MCP-only policy aligned with ADR-016 thin-bridge architecture.
  - **Strict-fact validation**: Append-only requirement supersession and migration guidance for strict fact adoption.

## Unreleased

### Patch Changes

- Clarify MCP-only agent guidance policy per ADR-016 thin-bridge behavior

  - README now describes agent-visible guidance as public MCP tools and sanctioned slash commands
  - Internal maintenance uses background sync operations; agents do NOT run sync commands directly
  - Architecture section emphasizes thin-bridge separation: agents use MCP tools while internal processes handle sync
  - Wording consistently reflects that all agent interaction occurs via MCP surface, not CLI

## 0.5.0

### Minor Changes

- Add durable knowledge comment detection for JS/TS and Python

  - New `comment-analysis.ts` module detects long durable-knowledge comments in code files
  - Supports JavaScript/TypeScript (`//`, `/* */`, `/** */`) and Python (`#` blocks, true docstrings)
  - Automatically classifies comments as FACT, ADR, REQ, SCEN, or TEST using knowledge classifier
  - Injects specific routing guidance based on classification type
  - Tracks seen comments by fingerprint to avoid repeated guidance
  - Adds `.py` to recognized code file extensions
  - Implements REQ-opencode-comment-routing with comprehensive test coverage

### Patch Changes

- Add must-priority-aware targeted validation for requirement edits

  - Requirement files with `priority: must` now get elevated validation checks
  - Must-priority edits trigger: `kibi check --rules required-fields,no-dangling-refs,must-priority-coverage`
  - Other KB-document edits keep standard checks: `required-fields,no-dangling-refs`
  - Adds `requirement-doc.ts` helper module for safe frontmatter parsing
  - Falls back gracefully on malformed or missing frontmatter
  - Implements REQ-opencode-kibi-plugin-v1: must-priority coverage validation

## 0.4.2

### Patch Changes

- 6e9e15c: Import plain string Markdown frontmatter `links` as generic `relates_to`
  relationships during `kibi sync`, and fix `kibi query --relationships` so it
  returns outgoing relationships reliably. Also fix `kibi-opencode` tarball ESM
  imports and self-contained plugin typings so packed installs can build and load
  the plugin and helper subpath exports in Node.
- dabf1af: Document the repo-local dogfood workflow, make the local MCP startup path resolve from nested working directories, and lock the local MCP/plugin wiring with tests.

## 0.4.1

### Patch Changes

- 1552f46: Fix plugin loader compatibility: root entrypoint now exports only plugin function to match OpenCode loader contract. Runtime helpers (config, prompt, scheduler, file-filter) moved to subpath exports (`./config`, `./prompt`, `./scheduler`, `./file-filter`). Fixes issue #82.

  ### Package entrypoint

  - Remove named exports `config`, `fileFilter`, `createSyncScheduler`, `injectPrompt`, `SENTINEL` from root
  - Keep only `default` export (plugin factory) and type-only exports

  ### Subpath exports

  - Add `./config` for config helpers (loadConfig, DEFAULTS, isPluginEnabled)
  - Add `./prompt` for prompt helpers (injectPrompt, buildPrompt, SENTINEL)
  - Add `./scheduler` for sync scheduler (createSyncScheduler, types)
  - Add `./file-filter` for file filtering (shouldHandleFile)

  ### Tests

  - Update packed e2e test to verify loader-safe root exports and test subpath access
  - Update local e2e test with same loader-safety verification
  - Tests now fail if any root export is a function (would be invoked by OpenCode)

  ### Documentation

  - Fix README example: use `"plugin"` instead of `"plugins"` key

  ### Notes

  - OpenCode loader imports module and iterates all exports, calling each as `fn(input)`.
  - Only functions exported from root are called; helper objects/constants now isolated to subpaths.

## 0.4.0

### Minor Changes

- Add dynamic contextual prompt guidance based on edit type and workspace state.
- Add path-kind classifier for detecting code, requirement, KB doc, and .kb edits.
- Add workspace health detector for bootstrap nudges.
- Emit loud warnings when agents attempt manual .kb/\*\* edits (gated on `guidance.warnOnKbEdits`).
- Add targeted validation checks for requirement completeness and traceability (gated on `guidance.targetedChecks.enabled`).
- Add session tracking with configurable periodic summaries (`guidance.sessionSummary`).
- Add `/init-kibi` advertisement to injected guidance.
- Update REQ-opencode-kibi-plugin-v1 to include enforcement features.
- Add SCEN-opencode-enforcement for enforcement workflow.
- Update TEST-opencode-kibi-plugin-v1 to cover enforcement features.

### Patch Changes

- All guidance config toggles now respected: `guidance.warnOnKbEdits`, `guidance.targetedChecks.enabled`, `guidance.sessionSummary.enabled/logIntervalMs`.
- Requirement lint path resolution now handles relative paths from worktree.

## 0.3.0

### Minor Changes

- Refreshed injected guidance to be concise and public-tool-only (removes trailing whitespace, consolidates traceability instructions).
- Updated hook policy documentation per ADR-016.
- Added hook-contract.test.ts to validate prompt injection and hook registration behavior.

## 0.2.0

### Minor Changes

- 9afc60f: Add kibi-opencode package for OpenCode integration

  - New packages/opencode package published as kibi-opencode
  - Prompt guidance injection with sentinel-based dedupe
  - Debounced single-flight sync scheduler
  - File filtering using Kibi sync semantics
  - Plugin config with global/project precedence
  - Non-blocking UX with logging
  - Unit tests for config, file-filter, scheduler, prompt, nonblocking
  - Packed e2e tests for local and npm loading
  - README with installation, configuration, and disablement docs

## 0.1.0

### Minor Changes

- Initial public release of the OpenCode plugin package.
- Adds prompt guidance injection with sentinel-based dedupe.
- Adds debounced single-flight `kibi sync` scheduling.
- Adds file filtering aligned with Kibi sync semantics.
- Adds plugin config with global/project precedence.
- Adds non-blocking UX with structured logging and test coverage.
