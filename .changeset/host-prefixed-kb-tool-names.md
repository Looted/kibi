---
"kibi-zcode": patch
"kibi-codex": patch
"kibi-cursor": patch
---

The ZCode, Codex, and Cursor plugins now recognize Kibi tools when the host
reports them with a prefix, such as `mcp__kibi__kb_check`. Before this fix,
an agent that correctly ran an impact check through a prefixed tool name
still got a stop reminder to run it, because the plugin never saw the check.

- `kb-mcp-tools.ts` in each adapter gains `canonicalKbToolName`, which strips
  `mcp__<server>__`, `MCP:`, and `kibi_` prefixes before matching `kb_*`
  operations.
- The Codex hook bundle is regenerated.
