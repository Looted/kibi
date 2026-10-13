---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": patch
---

`kb_query` can now return a requirement's prose. Entity rows carry only front matter, so an agent that found a stale sentence in a requirement's body had no way to read it before rewriting it. Passing `includeBody: true` with an `id` returns the authored Markdown body of that entity, which `kb_upsert` `document.body` replaces.

Technical summary: `kb_query` accepts `includeBody` (boolean, default false), refused without `id`. The answer gains `body: { id, path, text, truncated? }`, read from the entity's authored `.md` source inside the workspace (front matter stripped, cut at 32 000 characters); `text` is null for entities without such a document. The text content appends the body. The `kb_query` output contract and the frozen MCP tool-list fixtures include the new field and property.
