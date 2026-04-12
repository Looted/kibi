## 2026-04-12

- Added terminal-side `console.error("[kibi-opencode] startup toast failed:", err)` in the startup toast failure path.
- Kept the structured `client.app.log()` warning so failures still reach OpenCode logs.
- Verified `bun test packages/opencode/tests/startup-notifier.test.ts` and `bun run build:opencode` both pass.
