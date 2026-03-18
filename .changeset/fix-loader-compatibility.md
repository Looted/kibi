---
"kibi-opencode": patch
---

Fix plugin loader compatibility: root entrypoint now exports only plugin function to match OpenCode loader contract. Runtime helpers (config, prompt, scheduler, file-filter) moved to subpath exports (`./config`, `./prompt`, `./scheduler`, `./file-filter`). Fixes issue #82.

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
