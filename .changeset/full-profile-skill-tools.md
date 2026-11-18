---
"kibi-runtime": patch
"kibi-cli": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

The skills now say how to reach `kb_model`, `kb_compile_intent`, `kb_delete` and `kb_prepare_impact_review` when a project chooses the core MCP profile, which does not list them: at each first mention they give the tool's CLI form, such as `kibi model --input -`. The `kibi-usage` interfaces resource names the core profile's tools and how a project chooses it: `KIBI_MCP_TOOLS=core` or `kibi-mcp --tools core` for a session, or `"kibi": { "mcpTools": "core" }` in package.json or `"mcpTools": "core"` in `.kb/setup.json` for a project.
