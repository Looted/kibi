---
"kibi-cli": patch
"kibi-core": patch
"kibi-plugin-builtin": patch
---

`kibi check`, `kb_check` and `kibi check --staged` are faster and use less memory, with the same findings. On Kibi's own repository `kibi check` went from 64s to 25s and its peak memory from 1.5 GB to 740 MB, `kb_check` over MCP from 63s to 31s on a cold server and from 47s to 15s on a warm one, and a one-function staged commit from 20s to 13s.

- The checks build their property-fact listing once per knowledge base generation instead of once per scenario, read an entity's type straight from its type triple when they record a relationship, and hash each stored proof contract text once.
- The builtin TypeScript provider parses each file on its own: it no longer loads TypeScript's library declarations or follows imports, which deciding exported symbols never needed.
- The symbol granularity and symbol debt steps of one `kibi check` share the branch's source analysis cache. Each step used to save only the analyses it had used, so the second step dropped the first step's analyses and the next run parsed those files again.
- `kibi check --staged` reads the committed relationship and requirement files it compares against in one batch, and no longer saves its temporary knowledge base after loading the staged overlay.
