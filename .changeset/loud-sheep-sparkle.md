---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-opencode": patch
---

Kibi now has a reusable markdown skill subsystem across CLI, MCP, and OpenCode. The CLI exposes bundled skills with manifest validation and safe resource loading. The MCP server provides progressive-disclosure tools (`kb_skills_list`, `kb_skills_load`, `kb_skills_read`) for agents to discover and read skills without starting Prolog or touching the KB. OpenCode routes its guidance through the `kibi-usage` skill, giving agents a single source of truth for Kibi usage patterns. An official `kibi-usage` skill bundle ships with all three packages, covering fact lanes, relationship directions, and canonical workflows.

- feat(cli): add markdown skill loader with manifest types, validation errors, secure path/resource validation, and size limits
- feat(cli): expose `kibi-cli/skills` public export with `skills list`, `skills load`, `skills read`, `skills validate`
- feat(mcp): add `kb_skills_list`, `kb_skills_load`, `kb_skills_read` tool definitions, handlers, runtime wiring, and docs rendering
- feat(mcp): resolve bundled skills from packaged source assets when running from compiled CLI output
- feat(opencode): route agent guidance through `kibi-usage` skill, add `kb_skills_load` to tool listings
- docs: add official `kibi-usage` skill with fact lanes, relationship directions, and workflow guidance
- test: add mock-free MCP handler tests against real bundled `kibi-usage` skill, including invalid skill and resource errors
- test: add CLI skill unit coverage for valid bundles, validation errors, traversal/symlink escapes, oversize limits
