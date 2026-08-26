---
"kibi-mcp": minor
---

kibi-mcp now speaks the latest stable MCP protocol revision (2025-11-25) and
gives agent clients richer server metadata out of the box. When a client
connects, the server identifies itself with a human-readable title,
description, website URL, and Kibi logo icons, and includes instructions that
steer agents toward the discover-then-mutate workflow. Documentation resources
and prompts now carry display titles, so MCP client UIs can present them
properly instead of falling back to raw identifiers.

- Upgrade `@modelcontextprotocol/sdk` from ^1.26.0 to ^1.30.0 (protocol
  ceiling 2024-11-05 → 2025-11-25; tool input-validation failures now surface
  as tool-execution errors the model can self-correct, per SEP-1303).
- Enrich initialize `serverInfo` with `title`, `description`, `websiteUrl`,
  and SEP-973 `icons`; add initialize-result `instructions`.
- Migrate deprecated `server.prompt()`/`server.resource()` calls to
  `registerPrompt`/`registerResource`.
- Add `title` annotations for all 21 tools and for all documentation prompts
  and resources; attach logo icons to documentation resources.
- Update protocol-version tests to negotiate 2025-11-25 while asserting legacy
  2024-11-05 clients still connect.
