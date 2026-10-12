---
"kibi-mcp": minor
"kibi-cli": minor
---

Discovery results on Claude Code are now sent once: `kb_search`, `kb_query`, `kb_status` and `kb_prepare_impact_review` return their structured payload with a short text summary instead of repeating the whole `data` JSON in the text part, which doubled the bytes of every search answer on that host. Other hosts keep the JSON copy because they may hide `structuredContent`, and `KIBI_MCP_STRUCTURED_TEXT=omit` or `embed` overrides the choice on any host. `kb_search` and `kibi search` return 10 ranked rows by default instead of 20; `count` and `truncated` still say how many matches there are and whether to page.

Technical summary: `embedsStructuredText` in the MCP tool wrapper reads `KIBI_MCP_STRUCTURED_TEXT`, then `KIBI_MCP_HOST` (set by the host launchers), then the client's initialize name, and only hosts known to show `structuredContent` (`claude-code`) drop the embedded JSON. The `kb_search` schema default and executor default are 10.
