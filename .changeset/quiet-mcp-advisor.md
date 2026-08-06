---
"kibi-mcp": patch
---

The semantic advisor and predicate suggester are now explicitly identified as read-only MCP tools, so non-interactive clients can safely run modeling checks without prompting for approval. Newly created empty branch stores are also persisted immediately, preventing a successful first read from leaving later reads in an unstable state.

- Mark `kb_semantic_advisor` read-only and idempotent in the MCP tool annotations.
- Mark `kb_suggest_predicates` read-only and idempotent in the MCP tool annotations.
- Save a newly attached empty branch KB before serving subsequent requests.
