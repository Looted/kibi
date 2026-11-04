---
"kibi-claude": patch
---

The Claude Code hooks now recognize Kibi MCP tool names with the shared kibi-agent-core rule that the Codex, Cursor and ZCode hooks use, so every host reads the same tool name the same way. Cursor-style `MCP:kb_*` names are now recognized too.
