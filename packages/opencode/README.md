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
- Failures reported via logs, not toasts blocking workflow

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
| `ux.toastFailures` | boolean | `true` | Show toast on sync failures |
| `ux.toastSuccesses` | boolean | `false` | Show toast on sync success |
| `ux.toastCooldownMs` | number | `10000` | Minimum time between toasts |
| `logLevel` | string | `"info"` | Log level: `debug`, `info`, `warn`, `error` |

### Hook Modes

- `auto`: Use `experimental.chat.system.transform` (primary) or `chat.params` (fallback)
- `chat-params`: Use `chat.params` only (limited to model options)
- `system-transform`: Force `experimental.chat.system.transform`
- `compat`: Disable prompt injection, conservative sync only

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

## Telemetry Events

The plugin emits structured events:

- `prompt_injected`: Prompt guidance was injected
- `sync_triggered`: Sync was scheduled
- `sync_succeeded`: Sync completed successfully
- `sync_failed`: Sync failed
- `toast_shown`: Toast notification displayed
- `compat_mode_used`: Compat mode was activated

## License

MIT
