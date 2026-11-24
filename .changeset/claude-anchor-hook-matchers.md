---
"kibi-claude": patch
---

The Claude Code tool matchers in `hooks/hooks.json` are now anchored whole-string regular expressions, `^(...)$`. Claude Code tests a matcher that contains regex characters unanchored, so `Write` also matched `TodoWrite` and started the hook runner for tools the hooks do not handle. The PostToolUse matcher also requires the `__kb_` separator of Kibi MCP tool names, as the PreToolUse matcher already did.
