---
"kibi-opencode": patch
---

Quieter terminal behavior and logging correctness improvements:

- Normal-operation logs (`info`/`warn`) now route through structured `client.app.log()` instead of `console.log`/`console.warn`, silenced when no host client is available.
- Error-class events (bootstrap-needed, sync/check failure, hook/init failure) remain visible in terminal via `console.error`.
- All `client.app.log()` calls are now fire-and-forget with `.catch(console.error)` to prevent unhandled Promise rejections.
- `PluginClient` interface is now exported so TypeScript declaration emit succeeds when `declaration: true`.
- Logger client is reset at the start of each plugin invocation to prevent client state leaking across multiple in-process instantiations.
- `system.transform` hook now appends only the guidance block to `output.system`, avoiding duplication of prior prompt entries.
