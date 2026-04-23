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
- **Source-linked micro-briefs**: risky code edits (`behavior_candidate`, `traceability_candidate`) prepend a concise list of existing Kibi links (e.g., `- Existing Kibi links: REQ-001, REQ-002`) when 1-3 concrete source-linked KB hits are found in `documentation/symbols.yaml`. Skip on cache hit.
- **Start-task risky cue**: authoritative risky edits also add a compact `/brief-kibi` cue so agents can start with an explicit Kibi briefing before acting, while staying inside the same single prompt block and token budget.
- **Effective mode gating**: `strict` is only possible for `root_active` and `hybrid_root_plus_vendored` when `requireRootKbForStrict` is enabled; `maintenanceDegraded` overrides everything back to `advisory`
- **Low-token prompt policy**: docs-only and test-only edits avoid unnecessary discovery prompts; vendored-only repos suppress operational bootstrap nudges; at most one contextual block is injected per prompt (≤120 words, ≤5 bullets)
- **Completion reminder**: when `completionReminder` is enabled, risky code edits append a single prompt-visible `kb_check` reminder exactly once per cached context
- **Runtime maintenance overlay**: static `maintenanceDegraded` from posture is merged with a latched runtime overlay (sync disabled/unavailable/failing) so degraded state is consistently reflected in prompts, logs, and mode decisions
- **Advisory in editor, hard in hooks**: OpenCode guidance remains non-blocking; git hooks and KB validation checks stay the durable enforcement boundary
- **Structured observability**: posture, risk, cache, degraded-mode, targeted-check, and guidance events flow through structured plugin logs

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

### Start-Task Briefing

When the plugin detects an authoritative risky edit (`behavior_candidate` or `traceability_candidate` risk class), it automatically fetches a Kibi briefing from a background worker session via the `file.edited` event path. Auto-briefing is no longer deferred and provides immediate project context before you act.

- **Automatic delivery**: Briefings appear in a toast notification and inside the guidance block headed `🧠 **Kibi briefing available**`.
- **Contextual richness**: The briefing includes a summary and key source-linked bullets generated by the `kb_briefing_generate` MCP tool.
- **TL;DR fallback**: If a full briefing is unavailable, a summary is provided with a cue to use the manual command.
- **Manual command**: Use `/brief-kibi` at any time to trigger an on-demand briefing if auto-delivery is skipped or fails.

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

### Non-Blocking UX

- Sync runs in background, never blocks OpenCode
- Failures reported via console logs only, never as blocking UI elements

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
| `guidance.dynamic` | boolean | `true` | Enable dynamic contextual guidance |
| `guidance.warnOnKbEdits` | boolean | `true` | Enable loud warnings for .kb/** edits |
| `guidance.factFirstDomainRouting` | boolean | `true` | Enable FACT-first domain routing suggestions |
| `guidance.commentDetection.enabled` | boolean | `true` | Enable comment content analysis |
| `guidance.commentDetection.minLines` | number | `6` | Minimum lines to trigger comment analysis |
| `guidance.targetedChecks.enabled` | boolean | `true` | Enable post-sync targeted validation checks |
| `guidance.sessionSummary.enabled` | boolean | `true` | Enable periodic session summary logs |
| `guidance.sessionSummary.logIntervalMs` | number | `1800000` | Session summary interval (30 min) |
| `guidance.smartEnforcement.enabled` | boolean | `true` | Enable posture-aware, risk-aware guidance routing |
| `guidance.smartEnforcement.mode` | string | `"advisory"` | Smart-enforcement mode: `advisory` or `strict` |
| `guidance.smartEnforcement.preflightTtlMs` | number | `600000` | Guidance/cache TTL for repeated prompt suppression |
| `guidance.smartEnforcement.idleResetMs` | number | `1800000` | Idle window before smart-enforcement state resets |
| `guidance.smartEnforcement.degradedMode` | string | `"warn-once"` | Degraded-mode logging policy: `warn-once` or `structured-only` |
| `guidance.smartEnforcement.requireRootKbForStrict` | boolean | `true` | Only allow strict behavior for authoritative root KB postures |
| `guidance.smartEnforcement.completionReminder` | boolean | `true` | Emit a single completion-time KB check reminder for risky edits |
| `logLevel` | string | `"info"` | Log level: `debug`, `info`, `warn`, `error` |

### Hook Policy

Per ADR-016, prompt text injection uses only `experimental.chat.system.transform`. The `chat.params` hook is reserved for model option enrichment (temperature, topP, etc.) and never carries prompt text.

Smart enforcement keeps the plugin advisory-only: prompt injection can warn, explain, or remind, but it does not block the editor. Hard failures still belong to CLI hooks (`pre-commit`) and explicit check commands.

### Logging Policy

The plugin follows a **silent-except-operational-errors** policy for terminal output, with a three-tier failure classification:

| Classification | Examples | Surface | Terminal | Structured |
|---------------|----------|---------|----------|------------|
| **Advisory (background)** | scheduler check failures, degraded-mode latches | `errorStructuredOnly()` | No | Yes, via `client.app.log()` |
| **Operational (plugin)** | bootstrap-needed, sync failure, hook/init failure | `error()` | Yes, via `console.error` | Yes, via `client.app.log()` |
| **Authoritative external** | git hooks, CLI checks | Outside plugin surface | N/A | N/A |

### Failure Routing Contract

The logger exposes two error-level surfaces with distinct routing semantics:

- **`error(msg, metadata?)`** — Operational plugin failures. Always emits to `console.error` for terminal visibility, plus `client.app.log()` when a client is bound. Use for bootstrap-needed, hook/init failures, and sync failures that require developer attention.
- **`errorStructuredOnly(msg, metadata?)`** — Advisory background maintenance failures. Routes through `client.app.log()` only when a client is bound; completely silent when no client is bound (no `console.error` fallback). Use for scheduler check failures and degraded-mode latches.

**Contract rule:** Once `client` is bound (after `setClient()`), advisory logging MUST use `errorStructuredOnly()`. When no client is bound, `errorStructuredOnly()` is completely silent — it does not fall back to `console.error`.

Routine diagnostics route through [`client.app.log()`](https://opencode.ai/docs/plugins/) and never appear in the terminal. Only operational error-class events break terminal silence. This keeps the developer's workspace clean while preserving full visibility in structured logs for debugging.

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

## License

AGPL-3.0-or-later
