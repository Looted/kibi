2026-04-12: Added `ux.toastStartup` as a separate UX flag so startup confirmation can be toggled independently from sync-result toasts.
2026-04-12: Nested config merging must mirror the existing `ux` pattern: seed from `DEFAULTS`, then overlay each boolean/number key explicitly.
2026-04-12: Startup notifications should prefer runtime duck-typing against `client.tui.toast` and fall back to one structured `client.app.log()` call, keeping routine startup success silent in the terminal.
2026-04-12: The fallback payload should stay shaped like the existing logger bodies (`service`, `level`, `message`, plus metadata) so downstream structured log consumers can treat startup notifications consistently.

- Startup confirmation should be asserted through structured client.app.log payloads, not terminal output.
- The degraded bootstrap-needed path can still reach setup completion today, so a lifecycle test should pin the no-success-on-degraded rule before code changes.
2026-04-12: Monorepo architecture scan shows package boundaries are mostly already correct; the strongest justified simplification is internal decomposition of `packages/opencode/src/index.ts`, while core/cli/mcp/vscode package rewrites are mostly speculative.
2026-04-12: The OpenCode dogfood coupling is intentionally small and operational: `.opencode/plugins/kibi.ts` re-exports `packages/opencode/dist/index.js`, so improvements should target loader ergonomics rather than duplicating plugin logic.
# Task 4 learning: startup confirmation wiring

- `ux.toastStartup` now gates the post-setup notification.
- The startup notification must run after setup success and stay silent on degraded init.
- In tests, a no-op scheduler factory is needed to keep the happy-path setup non-degraded.
- Extracting the startup seam into `plugin-startup.ts` works best when the helper returns the full hook-scoped runtime context (`cfg`, `posture`, `cache`, `runtimeOverlay`, `scheduler`, and the derived getters) while `index.ts` keeps hook registration and closures.
