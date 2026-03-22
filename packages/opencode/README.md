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

### Dynamic Contextual Guidance

The plugin provides context-aware prompt guidance based on recent edits and workspace state:

- **Code edits**: Guidance for querying Kibi by sourceFile, preferring Kibi over comments, and adding `// implements REQ-xxx` traceability
- **Requirement edits**: Guidance for maintaining separate REQ/SCEN/TEST artifacts and avoiding embedded scenarios
- **KB doc edits**: Guidance for proper entity relationships and validation
- **Bootstrap needed**: Detection and nudges for uninitialized repos

### Targeted Validation Checks

After KB-document edits, the plugin queues targeted validation rules to run via background sync operations:

- **Must-priority requirement edits**: elevated validation including coverage checks
- **Other requirement/scenario/test/ADR/fact edits**: standard validation for required fields and dangling references

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
- **Classification**: Automatically categorizes as FACT (invariants/limits), ADR (decisions/tradeoffs), REQ (behavior), SCEN (flows), or TEST (verification)
- **Specific routing guidance**: Injects targeted prompts based on classification:
  - FACT: "This looks like a domain invariant; route to a FACT via Kibi"
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

OpenCode exposes Kibi MCP prompts as slash commands. The `/init-kibi` command runs the retroactive bootstrap workflow using only public MCP tools.

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
| `guidance.dynamic` | boolean | `true` | Enable dynamic contextual guidance |
| `guidance.warnOnKbEdits` | boolean | `true` | Enable loud warnings for .kb/** edits |
| `guidance.factFirstDomainRouting` | boolean | `true` | Enable FACT-first domain routing suggestions |
| `guidance.commentDetection.enabled` | boolean | `true` | Enable comment content analysis |
| `guidance.commentDetection.minLines` | number | `6` | Minimum lines to trigger comment analysis |
| `guidance.targetedChecks.enabled` | boolean | `true` | Enable post-sync targeted validation checks |
| `guidance.sessionSummary.enabled` | boolean | `true` | Enable periodic session summary logs |
| `guidance.sessionSummary.logIntervalMs` | number | `1800000` | Session summary interval (30 min) |
| `logLevel` | string | `"info"` | Log level: `debug`, `info`, `warn`, `error` |

### Hook Policy

Per ADR-016, prompt text injection uses only `experimental.chat.system.transform`. The `chat.params` hook is reserved for model option enrichment (temperature, topP, etc.) and never carries prompt text.

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
