---
"kibi-mcp": patch
---

`tools/list` now advertises an all-string choice as `{"type":"string","enum":[...]}` instead of one `anyOf` branch per value, so the shorter enum shape the tool schemas declare reaches MCP clients (the advertised input schemas shrink by about 3,000 lines).
