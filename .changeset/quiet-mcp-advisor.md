---
"kibi-mcp": patch
---

The semantic advisor is now explicitly identified as a read-only MCP tool, so non-interactive clients can safely run advisory checks without prompting for approval. This keeps diagnostic and SkillOpt smoke runs reliable while preserving the tool’s non-mutating behavior.

- Mark `kb_semantic_advisor` read-only and idempotent in the MCP tool annotations.
