---
"kibi-cli": minor
"kibi-mcp": patch
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
"kibi-vibe": patch
"kibi-antigravity": patch
---

`kb_search` and `kb_check` give each entity, statement and piece of advice once.

`kb_search`: a result whose entity the answer already quotes (a governing requirement with its whole statement, a fact with its claim) now carries only its `entity` `id`, `type` and `title`, its `score` and its `reasons`, without the snippet and evidence that repeated the answer. Every other result keeps its summary fields, and `fields: "full"` returns every result whole. On the repository's own questions a search result is 8 to 15 percent smaller.

`kb_check` with impact diagnostics:

- A `requirement_statement_unverified` diagnostic quotes the requirement's statement once, in `evidence.statement`; its message points there instead of quoting it again.
- Advice that diagnostics of one kind share is listed once in the new `impactAdvice` array. Each such diagnostic carries `advice`, its index there, in place of `suggestion`; a diagnostic with advice of its own keeps its `suggestion`. The text output and `kibi check --staged` are unchanged.
- `extractedSymbols` entries no longer list `linkedEntityIds`; `linkedEntities` lists every link with the symbol it comes from.

A check scoped to a large file is 18 to 23 percent smaller, and a scoped check that was refused as over the 64,000-character ceiling (for example on `packages/cli/src/search-answer.ts`) now returns.
