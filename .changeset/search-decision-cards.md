---
"kibi-cli": minor
"kibi-agent-core": minor
"kibi-plugin-sdk": minor
"kibi-plugin-search-hints": minor
"kibi-mcp": patch
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
"kibi-vibe": patch
"kibi-antigravity": patch
---

`kb_search` and `kibi search` now answer a question with decisions: five one-line cards for the requirements and ADRs that match it best, and up to seven more decisions related by meaning.

- Each card is one line of at most 300 characters. The words of the question are ranked over each decision's title, statement, facts and implementing symbols, and decisions scoped to the files you pass rank first. Near-identical decisions share one card, which lists the ones folded into it (`fields: "full"`).
- When the search-hints plugin is installed, its meaning ranking is fused into every search instead of being asked only for weak answers, and the decisions it finds that are not already a card are listed beside the cards. A decision is credited with the meaning of the scenarios, tests and facts it links. Without the plugin, or when it fails, the words rank alone.
- A requirement is named as governing only when its card covers at least half of the question. When no card does, the answer is weak: it names no governing requirement, lists the question's words that no decision holds, and never says that nothing governs.
- Passing `type` (`fact`, `scenario`, `test`, `symbol`) searches those entities as before, ten rows by default.
- `kibi.search-hints.v1` providers are now asked to score every decision and the entities it links, up to 50,000 entities per call (`SEARCH_HINTS_MAX_LIMIT`), instead of returning at most 20 hints.
