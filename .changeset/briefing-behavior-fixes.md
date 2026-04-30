---
"kibi-opencode": patch
"kibi-mcp": patch
---

Session-local baseline counts, semantic content-hash dedupe, compact promptBlock fallback, richer envelope fields, and VS Code popup-first UX. The OpenCode plugin now scopes audit deltas to the current session instead of cumulative branch totals, deduplicates briefs by normalized visible-content hash rather than briefId, and surfaces constraints, regression risks, and missing evidence in the envelope. The MCP server gracefully degrades the prompt block with compact truncation instead of returning empty content when over budget.
