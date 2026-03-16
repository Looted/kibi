# kibi-opencode

OpenCode plugin for Kibi - repo-local, per-branch, queryable knowledge base.

## Installation

```bash
npm install kibi-opencode
```

Or via OpenCode's plugin system in `opencode.json`:

```json
{
  "plugins": ["kibi-opencode"]
}
```

## Features

### Prompt Guidance Injection

The plugin injects guidance into OpenCode sessions to improve agent grounding:

```
Query Kibi before design/implementation work. Prefer kb_query/kb_check for context. Update KB artifacts after relevant changes. Remember symbol traceability requirements.
```

- Uses `<!-- kibi-opencode -->` sentinel to prevent duplicate injections
- Respects `prompt.enabled` and overall `enabled` config flags

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
