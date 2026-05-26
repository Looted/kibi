---
"kibi-opencode": minor
---

OpenCode sessions now surface a visible KB freshness status when source, test, or documentation changes leave the Kibi knowledge base unresolved. The plugin detects meaningful changes and requires agents to resolve KB impact as updated, no-impact with rationale, or deferred before completion. No new public commands were added — all enforcement uses existing MCP tools and the existing `kibi check --staged` hook boundary.

---
- feat: add internal KB freshness state machine and evidence store (kibi-opencode)
- feat: add meaningful-change classifier to distinguish source/document edits from lockfiles and build artifacts
- feat: extend enforcement policy to accept structured KB freshness evidence in checkpoint evaluation
- feat: wire tool-event observation and freshness evaluation into the OpenCode plugin lifecycle
- feat: surface visible `🧠 **Kibi freshness required**` block when KB impact is unresolved
- test: add staged-impact-contract test coverage for pre-commit hook backstop
