---
"kibi-runtime": patch
"kibi-cli": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

The skills now say where `kb_model`, `kb_compile_intent`, `kb_delete` and `kb_prepare_impact_review` come from. The default MCP profile does not list these four tools, so at each first mention the skills note that the tool is listed only in the full MCP profile and give its CLI form, such as `kibi model --input -`. The `kibi-usage` interfaces resource names the default tools and explains how to switch to the full profile: `KIBI_MCP_TOOLS=full` or `kibi-mcp --tools full` for a session, or `"kibi": { "mcpTools": "full" }` in package.json or `"mcpTools": "full"` in `.kb/setup.json` for a project.
