---
"kibi-cli": minor
"kibi-opencode": minor
"kibi-vscode": minor
---

Add shared brief configuration defaults for automatic TUI delivery across Kibi clients. The CLI now reads and exposes brief config from `.kb/config.json` with sensible boolean defaults (all enabled), the OpenCode plugin delivers idle brief summaries via toast notification with automatic prompt append and auto-submit, and the VS Code extension gates notifications by the shared brief policy. This provides a unified, zero-config experience for teams using multiple Kibi clients.