---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-opencode": patch
---

Unit coverage can now execute leftover defensive branches in CLI, MCP, and
OpenCode without lowering Codecov gates. Previously unreachable catch,
tie-break, workspace-escape, and package-walk paths are exported as small
helpers and covered by in-process remaining-coverage tests.

- Export leftover defensive helpers and add remaining-coverage tests.
- Keep migration `--yes` and delete `migrationRequired` blocks unchanged.
