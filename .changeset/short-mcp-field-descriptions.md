---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

The MCP tool list is about 15% smaller: every input field description it advertises is now one line of at most 120 characters, and a choice among string constants is advertised as an `enum`. A field whose rule needs more words keeps its full description in the operation catalog, where the CLI and input validation use it, and in the new kibi-usage resource `operation-fields`, which `kb_skills` reads. The per-tool size test now caps each tool at 15,000 characters (`kb_upsert` at 26,000) and the whole list at 132,000. `workspaceRoot` is described in one line on every tool; its full routing rule is in `operation-fields` and the MCP reference.

Operation specs mark such a field with `x-kibi-advertised-description`, whose value is the short description, and `advertisedInputSchema` advertises it in place of the full one.
