2026-04-12: Added `ux.toastStartup` as a separate UX flag so startup confirmation can be toggled independently from sync-result toasts.
2026-04-12: Nested config merging must mirror the existing `ux` pattern: seed from `DEFAULTS`, then overlay each boolean/number key explicitly.
2026-04-12: Startup notifications should prefer runtime duck-typing against `client.tui.toast` and fall back to one structured `client.app.log()` call, keeping routine startup success silent in the terminal.
2026-04-12: The fallback payload should stay shaped like the existing logger bodies (`service`, `level`, `message`, plus metadata) so downstream structured log consumers can treat startup notifications consistently.
