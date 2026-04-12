## 2026-04-12

- Restored `notifyStartup` to synchronous fire-and-forget behavior.
- `notifyStartup` now uses `void Promise.resolve(...).catch(...)` for toast/log calls so OpenCode boot is not blocked.
- Updated startup notifier tests to flush microtasks after invocation.
