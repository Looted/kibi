---
"kibi-opencode": minor
---

Document the native `/init-kibi` alias as a thin OpenCode UX wrapper over the existing MCP bootstrap workflow. When the plugin supports native command injection, `/init-kibi` is the canonical short alias; `/kibi:init-kibi:mcp` remains the namespaced fallback, and unsupported hosts fail closed with explicit guidance instead of pretending the alias exists.
