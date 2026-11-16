---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Each governing requirement in the `kb_search` answer now carries `why`, its recorded reason, so a question about why a rule is what it is can be answered from the record in one call.

- `why` is `{ recorded: true, text, from }` or `{ recorded: false }`. The reason comes from the requirement's `rationale` field, then its "Why this changed" section, then a Why, Rationale or Context section, then a linked current ADR's decision; a section that says "Reason not stated" records none. `text` is at most 280 characters.
- When the answer must shrink to its byte budget, the reason text goes after ADR excerpts and side lists, before the requirement's own facts and links.
- The answer note and the `kibi-usage` skill say to quote the recorded reason, not a neighbouring requirement's, and to say none is recorded when `why.recorded` is false.
