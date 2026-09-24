---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-plugin-builtin": patch
"kibi-plugin-jev": patch
---

This maintenance update brings the affected package code and tests into line with Kibi's Biome checks while preserving runtime behavior. It also replaces MCP non-null assertions with receiver-preserving method calls.

- Format affected files, sort imports, and remove unnecessary template literals.
- Preserve EngineClient `this` when forwarding optional Prolog methods.
