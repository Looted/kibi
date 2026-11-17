---
"kibi-mcp": minor
"kibi-cli": minor
"kibi-agent-core": patch
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

The firm-edit receipt is now an MCP tool, `kb_review_firm_edit`, so the MCP catalog has 18 tools. It records the agent's keeps-or-changes verdict on an edit of code that implements a current firm requirement, exactly as `kibi review-firm-edit` does. Before, it was reachable only through the CLI, and an agent that could not run the project CLI had no way to clear the `firm_edit_unreviewed` finding.

- The `firm_edit_unreviewed` finding names `kb_review_firm_edit` with the exact input to send, and gives `kibi review-firm-edit --input -` as the route without MCP.
- The Codex, Cursor and ZCode pre-edit notices and the `kibi-decisions` skill name the tool, with the CLI route beside it.
- The generated `kibi-usage` operation access reference lists it as an MCP tool.
