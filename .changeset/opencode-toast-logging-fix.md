---
"kibi-opencode": patch
---

Fix OpenCode toast delivery and structured logging behavior:

- Remove raw HTTP `fetch()` fallback to `/tui/show-toast` and all associated `[KIBI-TRACE]` console.error noise from the toast transport path.
- Repair `sendToast()` to use the official OpenCode SDK contract: prefers legacy `client.tui.toast(payload)` when available, otherwise uses `client.tui.showToast({ body: payload })`.
- Add discriminated `SendToastResult` union (`delivered`, `unavailable`, `failed`) for explicit, testable toast outcomes.
- Fix `makeToastClient()` to preserve bound TUI methods (`toast` and `showToast`) so `this` context is not lost.
- Align logger contract: `info()` and `warn()` remain terminal-silent even when `client.app.log()` rejects; `error()` emits exactly one prefixed `console.error` without secondary spam from structured log rejection.
- Update startup notifier to log truthful structured outcomes (`startup toast delivered`, `startup toast unavailable`, `startup toast delivery failed`) instead of `result: String(undefined)`.
- Remove `serverUrl` parameter from toast call chains and `PluginInput` interface.
- Add regression coverage at unit level (`packages/opencode/tests/toast.test.ts`) and built-artifact level (`documentation/tests/e2e/opencode-plugin-local.test.ts`).
- Update README and DEV.md to document the repaired toast and logging contracts.
