---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-opencode": patch
---

Kibi discovery is now less noisy for broad agent queries. When agents send multi-intent natural-language searches, targeted domain-specific entities now rank above unrelated generic results. No-signal queries (containing only common stop words) return an empty result instead of arbitrary token-coverage matches. OpenCode agents are now guided to decompose broad queries into focused probes and follow up with exact `kb_query` lookups.

- `kibi-cli`: Add stop-word filtering, hyphen normalization, plural normalization, and minimum-score threshold to `search-ranking.ts`; add synthetic regression corpus tests.
- `kibi-mcp`: Add wrapper-level regression tests asserting improved ranking is preserved end-to-end.
- `kibi-opencode`: Update injected agent guidance to instruct query decomposition with concrete examples.
