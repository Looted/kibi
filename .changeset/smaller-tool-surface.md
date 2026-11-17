---
"kibi-mcp": minor
"kibi-cli": minor
"kibi-runtime": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

An MCP session now loads about a third of the tool definitions it used to. The server lists six tools by default (`kb_search`, `kb_query`, `kb_upsert`, `kb_check`, `kb_status` and `kb_skills`), plus `kb_plan_bootstrap` and `kb_apply_plan` while the knowledge base is still empty. On a populated knowledge base the `tools/list` answer drops from 130,598 to 46,523 characters, and the part a model reads (names, descriptions and input schemas) from 71,313 to 26,066. The initialize instructions name the operations that are not listed; each one runs through the project CLI with the same JSON input (`npx --no-install kibi <command> --input -`).

`kb_upsert` now advertises the 15 entity fields used to capture a requirement or decision, and its advertised input schema drops from 19,124 to 8,471 characters. The fact, symbol, test and proof fields are still accepted and validated as before; the kibi-usage resource `operation-fields` describes them.

Codex now receives each discovery result once: Codex gives the model the serialized `structuredContent` in place of the text part, so the text part no longer repeats the data JSON for it. Cursor and Gemini CLI, which give the model only the text part, keep the copy.

`kibi --help` lists each command with the first sentence of its description and no longer lists the narrow routes that `skill`, `model` and an `upsert` with `dryRun: true` cover (`skills-list`, `skills-load`, `skills-read`, `semantic-advisor`, `model-requirement`, `suggest-predicates`, `validate-upsert`). It drops from 16,744 to 5,149 characters. Those commands still run, and each command's own `--help` keeps its full description.

Migration: an agent that called a tool outside the six now runs it through the CLI, or the project lists every tool with the `full` profile. Choose it with `KIBI_MCP_TOOLS=full` in the MCP server's environment, `kibi-mcp --tools full`, `"kibi": { "mcpTools": "full" }` in the root `package.json`, or `"mcpTools": "full"` in `.kb/setup.json`. The environment variable and the flag take precedence over the project setting. Optional tools named in `KIBI_MCP_OPTIONAL_TOOLS` are listed in either profile. Set `KIBI_MCP_STRUCTURED_TEXT=embed` to keep the data JSON in the text part for Codex.

Technical summary: `kibi-mcp` adds `resolveToolProfile`, `knowledgeBaseIsEmpty`, `profileToolNames`, `DEFAULT_PROFILE_TOOLS` and `BOOTSTRAP_TOOLS` in `tools-config`, and `registerAllTools` and `registerConfiguredTools` take the listed names. `serverInstructions(listed)` builds the initialize instructions. Codex (`KIBI_MCP_HOST=codex` or the client name `codex-mcp-client`) joins Claude Code among the hosts that read `structuredContent`. Operation specs can mark an object schema with `x-kibi-advertised-fields` (`ADVERTISED_FIELDS`) to advertise only the named properties, and the generated field reference lists the fields left out. Output schemas are unchanged: Codex code mode renders them into types, and no host was found that gives them to the model otherwise. The `kibi-usage` `operation-fields` resource is regenerated in every host's skill copy. The MCP contract fixtures and the CLI surface fixtures are regenerated, and the tool-surface budget test caps a default-profile list at 64,000 characters and a full list at 122,000.
