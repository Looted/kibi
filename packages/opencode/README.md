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

After KB-document edits, the plugin runs targeted `kibi check` rules:

- **Requirement/scenario/test/ADR/fact edits**: `kibi check --rules required-fields,no-dangling-refs`
- **Must-priority requirements**: `kibi check --rules must-priority-coverage`

Runs in background after sync completes, non-blocking.

### FACT-First Domain Routing

Long comments and prose are analyzed to suggest appropriate Kibi entity types:

- **FACT**: Domain invariants, property values, limits, cardinality (e.g., "must be unique", "at most", "default is")
- **REQ**: System behavior, capabilities, obligations (e.g., "system must", "user can")
- **ADR**: Technical decisions, tradeoffs, rationale (e.g., "we chose", "because", "constraint")
- **SCEN**: Behavior examples, Given/When/Then flows
- **TEST**: Verification language, assertions

### Loud `.kb/**` Edit Warnings

Manual edits to files under `.kb/**` trigger prominent warnings:

- Logs warning immediately
- Injects prompt guidance discouraging manual `.kb` edits
- Directs agents toward MCP/CLI tools (`kb_upsert`, `kb_query`, etc.)

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

### Prompt Guidance Injection

The plugin injects guidance into OpenCode sessions to improve agent grounding. Uses `<!-- kibi-opencode -->` sentinel to prevent duplicate injections and respects `prompt.enabled` and overall `enabled` config flags.

### Bootstrap Command

OpenCode exposes Kibi MCP prompts as slash commands. The `/init-kibi` command runs the retroactive bootstrap workflow using only public MCP tools.

### Debounced Sync

Automatically runs `kibi sync` after relevant file edits:

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

This repository uses a local shim at `.opencode/plugins/kibi.ts` for development. The npm package (`kibi-opencode`) is the public distribution artifact.

## Architecture

This is a thin bridge layer:

- Reuses `kibi` CLI for sync operations
- Reuses existing MCP tools (`kb_query`, `kb_check`, etc.)
- Does NOT own KB storage, parsing, or validation

### Future: File-Context Virtual Injection

A proposed enhancement would inject Kibi context hints into file-read results (e.g., "This symbol has linked requirements"). This is **deferred** because:

1. OpenCode's current plugin surface does not expose file-content interception hooks
2. The `experimental.chat.system.transform` hook only supports system prompt injection
3. Symbol metadata from `documentation/symbols.yaml` can inform this feature once host support exists

Current workaround: static system prompt guidance directs agents to query Kibi explicitly.

## License

AGPL-3.0-or-later
