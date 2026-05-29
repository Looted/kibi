# kibi-opencode

OpenCode plugin for Kibi - repo-local, per-branch, queryable knowledge base.

## Installation

```bash
npm install kibi-opencode
```

Or via OpenCode's plugin system in `opencode.json`:

```json
{
  "plugin": ["kibi-opencode"]
}
```

## Features

### Smart Enforcement

The plugin now uses a posture-aware, low-token smart-enforcement model before emitting any guidance:

- **Repo posture detection**: distinguishes `root_active`, `root_partial`, `root_uninitialized`, `vendored_only`, and `hybrid_root_plus_vendored`
- **Risk classification**: separates `safe_docs_only`, `safe_test_only`, `kb_doc_structural`, `req_policy_candidate`, `behavior_candidate`, `traceability_candidate`, and `manual_kb_edit`
- **Source-linked Kibi links**: risky code edits (`behavior_candidate`, `traceability_candidate`) prepend a concise list of existing Kibi links (e.g., `- Existing Kibi links: REQ-001, REQ-002`) when 1-3 concrete source-linked KB hits are found in `documentation/symbols.yaml`. Skip on cache hit.
- **Start-task risky cue**: authoritative risky edits also add a compact Kibi context cue so agents can start with explicit source-linked guidance before acting, while staying inside the same single prompt block and token budget.
- **Effective mode gating**: `advisory` (default) never blocks; `strict` escalates checks and reminders for `root_active` and `hybrid_root_plus_vendored` postures when `requireRootKbForStrict` is enabled; `hard` fails closed for authoritative roots and linked git worktrees, injecting a stop-state with MCP recovery steps until the Kibi checkpoint passes. `maintenanceDegraded` overrides everything back to `advisory`.
- **Low-token prompt policy**: docs-only and test-only edits avoid unnecessary discovery prompts; vendored-only repos suppress operational bootstrap nudges; at most one contextual block is injected per prompt (≤120 words, ≤5 bullets)
- **Completion reminder**: when `completionReminder` is enabled, risky code edits append a single prompt-visible `kb_check` reminder exactly once per cached context
- **Runtime maintenance overlay**: static `maintenanceDegraded` from posture is merged with a latched runtime overlay (sync disabled/unavailable/failing) so degraded state is consistently reflected in prompts, logs, and mode decisions
- **Three-mode enforcement**: `advisory` by default keeps guidance non-blocking; opt-in `strict` adds elevated validation cues; `hard` blocks the prompt for authoritative workspaces until the checkpoint cycle succeeds. Git hooks and KB validation checks remain the durable enforcement boundary for all modes.
- **Structured observability**: posture, risk, cache, degraded-mode, targeted-check, and guidance events flow through structured plugin logs

### KB Freshness Contract

Meaningful code, test, requirement, scenario, and symbol changes now require explicit
KB impact resolution before task completion. When source or documentation files are
modified, the plugin evaluates KB freshness evidence and surfaces a visible
`🧠 **Kibi freshness required**` block when KB impact is unresolved.

**Allowed resolutions:**
- **KB updated**: Run source-linked discovery via `kb_search`, create or update entities
  with `kb_upsert` (or remove with `kb_delete`), then run `kb_check`.
- **No KB impact**: Include a no-impact rationale in the final report after source-linked
  discovery via `kb_search` or `kb_query(sourceFile=...)` and `kb_check`.
- **Deferred/Failed**: Do not claim task completion.

### Dynamic Contextual Guidance

The plugin provides context-aware prompt guidance based on recent edits and workspace state:

- **Code edits**: Guidance for querying Kibi by sourceFile, preferring Kibi over comments, and adding `// implements REQ-xxx` traceability
- **Requirement edits**: Guidance for maintaining separate REQ/SCEN/TEST artifacts and avoiding embedded scenarios
- **KB doc edits**: Guidance for proper entity relationships and validation
- **Bootstrap needed**: Detection and nudges for uninitialized repos

### Targeted Validation Checks

After KB-document edits, the plugin queues targeted validation rules to run via background sync operations:

- **Must-priority requirement edits**: elevated validation including coverage checks (`must-priority-coverage`) and `strict-req-fact-pairing`
- **Traceability candidate code edits**: schedules `symbol-traceability` via reason `smart-enforcement.traceability`
- **Fact KB doc edits**: includes `strict-fact-shape` validation alongside standard structural checks
- **Requirement KB doc edits**: includes `strict-req-fact-pairing` validation alongside standard structural checks

The plugin inspects requirement frontmatter to detect `priority: must` and schedules elevated validation for critical requirements. Runs in background after sync completes, non-blocking. Can be disabled via `guidance.targetedChecks.enabled: false`.

### Loud `.kb/**` Edit Warnings

When `guidance.warnOnKbEdits` is enabled (default: `true`), manual edits to files under `.kb/**` trigger prominent warnings:

- Logs warning immediately
- Injects prompt guidance discouraging manual `.kb` edits
- Directs agents toward public MCP tools (`kb_upsert`, `kb_query`, etc.)

### Session Tracking and Pattern Detection

The plugin tracks warning patterns across the session and provides periodic summaries:

- **Warning categories**: kb-edit, embedded-scenario-in-req, embedded-test-in-req, long-comment-missed-fact, missing-traceability, bootstrap-needed
- **Repeated pattern alerts**: Warns when the same anti-pattern occurs 3+ times
- **Session summaries**: Periodic logs of total warnings and top patterns (default: every 30 minutes)
- **Top files with warnings**: Tracks which files generate the most guidance
- **Requirement linting**: Detects embedded scenarios/tests in requirement files

Example session summary:
```
session.summary: 12 total warnings
  kb-edit: 3
  missing-traceability: 5
  bootstrap-needed: 1
  embedded-scenario-in-req: 3
session.patterns: Repeated anti-patterns detected:
  missing-traceability: 5 occurrences
```

### Durable Knowledge Comment Detection

When editing code files, the plugin analyzes long comments and docstrings for durable knowledge that should be routed to Kibi instead of inline comments:

- **Supported languages**: JavaScript/TypeScript (`//`, `/* */`, `/** */`) and Python (`#` blocks, true docstrings)
- **Smart filtering**: Only analyzes comments above `guidance.commentDetection.minLines` threshold
- **Classification**: Automatically categorizes as FACT (strict domain facts: invariants/limits/cardinalities), ADR (decisions/tradeoffs), REQ (behavior), SCEN (flows), or TEST (verification)
- **Specific routing guidance**: Injects targeted prompts based on classification:
  - FACT: "This looks like a strict domain fact (invariant/property/limit); route to a FACT via Kibi. Bug/workaround notes use `fact_kind: observation` or `meta`."
  - ADR: "This looks like decision rationale; route to an ADR"
  - REQ: "This looks like behavior intent; route to a REQ"
- **Deduplication**: Tracks seen comments by fingerprint to avoid repeated guidance
- **Non-blocking**: Analysis runs without blocking sync or other operations

Example Python file triggering FACT guidance:
```python
"""
User accounts must have unique email addresses.
Each user can have at most 5 active sessions.
Sessions expire after 30 minutes of inactivity.
"""
```

### Prompt Guidance Injection

The plugin injects guidance into OpenCode sessions to improve agent grounding. Uses `<!-- kibi-opencode -->` sentinel to prevent duplicate injections and respects `prompt.enabled` and overall `enabled` config flags.

### Bootstrap Command

OpenCode exposes Kibi MCP prompts as slash commands. The \`/init-kibi\` command triggers the \`kb_autopilot_generate\` workflow to assist in retroactive bootstrap using only public MCP tools.

### Discovery-first MCP guidance

Agent-visible guidance is intentionally limited to the curated public MCP surface:

- Discovery/reporting: `kb_search`, `kb_query`, `kb_status`, `kb_find_gaps`, `kb_coverage`, `kb_graph`
- Mutation/validation: `kb_upsert`, `kb_delete`, `kb_check`

The plugin guidance prefers `kb_search` for broad discovery, then `kb_query` for exact/source-linked follow-up.

### Background Sync Operations

Internal maintenance automatically syncs the knowledge base after relevant file edits:

- Single-flight scheduler (no overlapping syncs)
- Debounce window (default: 2000ms)
- Dirty flag triggers one trailing rerun after active sync completes
- **Idle suppression**: Background sync attempts triggered by session idle are suppressed after an operational sync failure is latched (`scheduler_sync_failed`). Manual edits and tool executions continue to schedule syncs to allow for recovery.

### Non-Blocking UX

- Sync runs in background, never blocks OpenCode
- **Non-blocking toast delivery**: Toast transport is best-effort. The plugin detects available OpenCode TUI capabilities (`client.tui.toast` or `client.tui.showToast`) and uses the official SDK contract. Toast failures resolve to structured `SendToastResult` objects (`delivered`, `unavailable`, `failed`) rather than throwing or falling back to raw HTTP requests.

## Configuration

Config files (project overrides global):

- Global: `~/.config/opencode/kibi.json`
- Project: `.opencode/kibi.json`

### Config Keys

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable all plugin features |
| `prompt.enabled` | boolean | `true` | Enable prompt guidance injection |
| `prompt.hookMode` | string | `"auto"` | Hook mode: `auto`, `chat-params`, `system-transform`, `compat` |
| `sync.enabled` | boolean | `true` | Enable automatic sync |
| `sync.debounceMs` | number | `2000` | Debounce window in milliseconds |
| `sync.ignore` | string[] | `[]` | Additional paths to ignore |
| `sync.relevant` | string[] | `[]` | Additional relevant paths |
| `ux.toastStartup` | boolean | `true` | Show the startup confirmation toast independently from sync-status toasts |
| `ux.toastFailures` | boolean | `true` | Show failure toasts for sync/check issues |
| `ux.toastSuccesses` | boolean | `false` | Show success toasts for sync/check completion |
| `ux.toastCooldownMs` | number | `10000` | Cooldown between repeated UX toasts |
PP|| `guidance.dynamic` | boolean | `true` | Enable dynamic contextual guidance |
| `guidance.dynamic` | boolean | `true` | Enable dynamic contextual guidance |
| `guidance.warnOnKbEdits` | boolean | `true` | Enable loud warnings for .kb/** edits |
| `guidance.factFirstDomainRouting` | boolean | `true` | Enable FACT-first domain routing suggestions |
| `guidance.commentDetection.enabled` | boolean | `true` | Enable comment content analysis |
| `guidance.commentDetection.minLines` | number | `6` | Minimum lines to trigger comment analysis |
| `guidance.targetedChecks.enabled` | boolean | `true` | Enable post-sync targeted validation checks |
| `guidance.sessionSummary.enabled` | boolean | `true` | Enable periodic session summary logs |
| `guidance.sessionSummary.logIntervalMs` | number | `1800000` | Session summary interval (30 min) |
| `guidance.smartEnforcement.enabled` | boolean | `true` | Enable posture-aware, risk-aware guidance routing |
| `guidance.smartEnforcement.mode` | string | `"advisory"` | Smart-enforcement mode: `advisory`, `strict`, or `hard` |
| `guidance.smartEnforcement.preflightTtlMs` | number | `600000` | Guidance/cache TTL for repeated prompt suppression |
| `guidance.smartEnforcement.idleResetMs` | number | `1800000` | Idle window before smart-enforcement state resets |
| `guidance.smartEnforcement.degradedMode` | string | `"warn-once"` | Degraded-mode logging policy: `warn-once` or `structured-only` |
| `guidance.smartEnforcement.requireRootKbForStrict` | boolean | `true` | Only allow strict behavior for authoritative root KB postures |
| `guidance.smartEnforcement.completionReminder` | boolean | `true` | Emit a single completion-time KB check reminder for risky edits |
| `logLevel` | string | `"info"` | Log level: `debug`, `info`, `warn`, `error` |

### Hook Policy

Per ADR-016, prompt text injection uses only `experimental.chat.system.transform`. The `chat.params` hook is reserved for model option enrichment (temperature, topP, etc.) and never carries prompt text.

Smart enforcement is `advisory` by default: prompt injection can warn, explain, or remind without blocking the editor. Opt-in `strict` escalates validation reminders, and `hard` can block the prompt for authoritative roots and linked worktrees until the Kibi checkpoint passes. Hard failures outside the plugin surface still belong to CLI hooks (`pre-commit`) and explicit check commands.

### Logging Policy

The plugin follows a **silent-except-operational-errors** policy for terminal output, with a three-tier failure classification:

| Classification | Examples | Surface | Terminal | Structured |
|---------------|----------|---------|----------|------------|
| **Advisory (background)** | routine `info()`, `warn()`, scheduler check failures, degraded-mode latches, `errorStructuredOnly()` | `client.app.log()` | No | Yes, via `client.app.log()` |
| **Operational (plugin)** | bootstrap-needed, sync failure, hook/init failure | `error()` | Yes, exactly one prefixed `console.error` (`[kibi-opencode]`) | Yes, via `client.app.log()` |
| **Authoritative external** | git hooks, CLI checks | Outside plugin surface | N/A | N/A |

### Failure Routing Contract

The logger exposes two error-level surfaces with distinct routing semantics:

- **`error(msg, metadata?)`** — Operational plugin failures. Emits exactly one prefixed `console.error` (`[kibi-opencode]`) for terminal visibility, plus `client.app.log()` when a client is bound. Structured log rejection does not emit secondary console noise. Use for bootstrap-needed, hook/init failures, and sync failures that require developer attention. Operational sync failure payloads include diagnostic metadata: `syncCommand`, `syncStdout`, `syncStderr`, and `syncErrorMessage`.
- **`errorStructuredOnly(msg, metadata?)`** — Advisory background maintenance failures. Routes through `client.app.log()` only when a client is bound and remains terminal-silent even when the structured transport rejects. Use for scheduler check failures and degraded-mode latches.



**Contract rule:** Once `client` is bound (after `setClient()`), advisory paths (`info()`, `warn()`, `errorStructuredOnly()`) MUST stay on `client.app.log()` and remain terminal-silent. Operational failures use `error()` for a single prefixed terminal emission without duplicating console output when structured logging rejects.

Routine diagnostics route through [`client.app.log()`](https://opencode.ai/docs/plugins/) and never appear in the terminal. Only operational error-class events break terminal silence. This keeps the developer's workspace clean while preserving full visibility in structured logs for debugging.

### Toast Transport Contract

The plugin uses the official OpenCode toast APIs with automatic capability detection:

1. **Legacy transport**: `client.tui.toast(payload)` — used when available in plugin context
2. **SDK transport**: `client.tui.showToast({ body: payload })` — used as fallback
3. **No capability**: Returns `{ status: "unavailable", reason: "missing-capability" }`
The `sendToast` helper returns a discriminated `SendToastResult` union and never throws. There is no raw HTTP fallback.
The `experimental.chat.system.transform` hook handles prompt injection (see [Hook Policy](#hook-policy)). The `chat.params` hook is compatibility-only and never carries prompt text.

### Hook Modes

- `auto`: Use `experimental.chat.system.transform` (primary); `chat.params` is a no-op registration for host compatibility
- `chat-params`: Disable prompt injection; `chat.params` hook is registered but does not modify prompt text
- `system-transform`: Force `experimental.chat.system.transform` for prompt injection
- `compat`: Disable prompt injection entirely, conservative sync only

## Disablement

### Project-Level Disablement

Create `.opencode/kibi.json`:

```json
{
  "enabled": false
}
```

This disables all plugin features even if loaded globally.

### Feature-Level Disablement

Disable specific features while keeping others:

```json
{
  "prompt": {
    "enabled": false
  },
  "sync": {
    "enabled": false
  }
}
```

## Dogfooding

This repository's OpenCode setup dogfoods local built artifacts. `opencode.json` starts the local `kibi-mcp` server, `.opencode/plugins/kibi.ts` re-exports `packages/opencode/dist/index.js`, and the published npm package (`kibi-opencode`) remains the distribution artifact for external consumers. See [DEV.md](DEV.md) for the repo-local workflow and rebuild rule.

## Troubleshooting

If you see a false "workspace needs Kibi bootstrap" warning even though your workspace is already initialized with `.kb/config.json` pointing at relocated `kibi-docs/*` paths, this indicates a stale plugin cache. See [the main troubleshooting docs](../../docs/troubleshooting.md#opencode-shows-workspace-needs-kibi-bootstrap-before-the-tui) for recovery steps.

## Architecture

This is a thin bridge layer per ADR-016:

- **Agent-visible guidance**: Public MCP tools (`kb_query`, `kb_upsert`, `kb_check`, etc.) and sanctioned slash commands (`/init-kibi`)
- **Discovery-first workflow**: Agents are guided to use `kb_search` first, then `kb_query`, then reporting tools like `kb_status`, `kb_find_gaps`, `kb_coverage`, and `kb_graph` when needed
- **Internal maintenance**: Background sync operations handle KB synchronization; agents do NOT run sync commands directly
- Does NOT own KB storage, parsing, or validation

### Future: File-Context Virtual Injection

A proposed enhancement would inject Kibi context hints into file-read results (e.g., "This symbol has linked requirements"). This is **deferred** because:

1. OpenCode's current plugin surface does not expose file-content interception hooks
2. The `experimental.chat.system.transform` hook only supports system prompt injection
3. Symbol metadata from `documentation/symbols.yaml` can inform this feature once host support exists

Current workaround: static system prompt guidance directs agents to query Kibi explicitly.

### File-Context Guidance

The plugin provides proactive guidance when agents perform file operations:

- **File-create/edit guidance**: When an agent creates or edits a source file, the plugin may inject reminders to check Kibi for that path if e2e evidence exists.

- **File-delete safety guidance**: When an agent attempts to delete a file, the plugin injects a safety check reminding the agent to verify if the file implements any Kibi requirements before removal.

### Repository Ignore Support

The OpenCode plugin respects the repository ignore policy used by Kibi's discovery pipeline. In practice this means:

- The plugin's background sync and file-event handling skip paths matched by repository `.gitignore` files, nested `.gitignore` files, and `.git/info/exclude`.
- The plugin also treats a curated set of tool/runtime directories as never-relevant for KB sync (for example: `.sisyphus`, `.opencode`, `.kb`, `.git`, `node_modules`, `vendor`, `third_party`).

When a file event occurs for an ignored path, the plugin skips processing and will not surface candidate guidance for that file. This avoids noisy sync triggers and prevents build/editor artifacts from triggering KB sync work.

- **E2e reminder evidence**: File-operation reminders use exact Kibi graph evidence first (`covered_by` links to `[e2e]`-tagged entities or `/e2e/`-sourced entities) and narrow path heuristics second. Package-level e2e tests do not trigger "authoritative evidence" flags at the file level.

- **Session suppression**: To minimize prompt noise, this guidance is suppressed after the first occurrence per path per session.

- **Current-host scope**: This feature uses host-side event monitoring to detect intent; it does not intercept or modify actual file content returned by the Read tool.

## License

AGPL-3.0-or-later
