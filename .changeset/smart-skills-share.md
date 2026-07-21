---
"kibi-cli": patch
"kibi-mcp": patch
---

Skill discovery now returns the same bundled metadata, content hashes, and declared resources through CLI JSON routes and MCP tools. This makes scripted CLI usage consistent with agent-facing skill loading while preserving the existing human-oriented `kibi skills` commands.

- Share bundled skill list, load, and resource-read executors between CLI and MCP.
- Exercise all three skill operations through the executable CLI/MCP parity harness.
