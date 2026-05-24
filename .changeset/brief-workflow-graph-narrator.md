---
"kibi-mcp": minor
"kibi-opencode": minor
---

Users now automatically receive rich, semantic briefs when they modify knowledge base entities through MCP tools. Instead of seeing only file names and timestamps, briefs now tell a clear story about what changed—like "Requirement AUTH-001 was superseded by AUTH-002"—making it easier to understand the impact of KB updates and track knowledge evolution across branches.

- **kibi-mcp**: `kb_upsert` and `kb_delete` now write brief-pending markers to `.kb/briefs/pending/` on successful mutation.
- **kibi-opencode**: Added idle handler that consumes pending markers, graph-narrative engine for inferring semantic stories, and enhanced brief generation with user-centric narratives (headline, domain changes, relationship changes). TUI delivery shows "Kibi Knowledge Update" toast.