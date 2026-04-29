---
"kibi-opencode": patch
"kibi-vscode": patch
---

Document render-first idle briefing behavior and mark deprecated config keys. The OpenCode and VS Code READMEs now reflect the shift from notification-based delivery to render-first briefings. Several legacy configuration knobs (`briefs.tui.toast`, `briefs.tui.appendPrompt`, `ux.briefs.autoSubmit`) are now marked as deprecated/no-op for idle rendering while remaining parseable for compatibility. Shared channel gating in `.kb/config.json` remains the authoritative source of truth.
