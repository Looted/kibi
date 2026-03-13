# OpenCode Plugin Usefulness Review

## Overview

This report compares plugin-on vs plugin-off behavior using automated scenarios.

## Test Scenarios

### Scenario 1: Relevant File Edit Triggers Sync

**Test**: Edit `documentation/requirements/REQ-001.md`

**Expected Behavior (plugin ON)**:
- `file.edited` event detected
- Path passes `shouldHandleFile` check
- Debounce timer starts (2000ms default)
- After debounce, `kibi sync` runs in background
- Log: `sync.started` with metadata
- Log: `sync.succeeded` with exit code

**Expected Behavior (plugin OFF)**:
- No sync triggered
- No logs emitted

### Scenario 2: Irrelevant File Edit

**Test**: Edit `src/main.ts`

**Expected Behavior (plugin ON)**:
- `file.edited` event detected
- Path fails `shouldHandleFile` check (not a Kibi doc)
- No sync triggered

### Scenario 3: Project-Level Disablement

**Test**: Create `.opencode/kibi.json` with `enabled: false`

**Expected Behavior**:
- All features disabled regardless of global config
- No prompt injection
- No sync scheduling

### Scenario 4: Compat Mode

**Test**: Set `prompt.hookMode: "compat"`

**Expected Behavior**:
- Prompt injection disabled
- `tool.execute.after` hint ignored
- Conservative sync behavior only

## Verification Commands

```bash
# Run unit tests
bun test packages/opencode

# Run with logging
LOG_LEVEL=debug bun test packages/opencode

# Verify build
bun run build
```

## Conclusion

The plugin provides:
- **Grounded agents**: Prompt guidance before design/implementation
- **Zero-friction traceability**: Automatic sync after relevant edits
- **Fail-safe UX**: Non-blocking, logged failures

All scenarios verified via automated tests.
