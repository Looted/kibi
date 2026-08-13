---
"kibi-cli": minor
"kibi-mcp": minor
---

Kibi search can now recover requirements from unfamiliar functionality wording and changed source locations when the host agent supplies semantic facets. Intent searches return deterministic ranking evidence, traceability graph evidence, and an explicit abstention signal for low-confidence results while preserving the existing lexical search behavior.

- Add the `intent-v1` search ranking mode and source-location validation.
- Expose semantic facet matches, source matches, graph paths, and query analysis in shared CLI/MCP structured output.
