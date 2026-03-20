---
"kibi-cli": patch
---

Import plain string Markdown frontmatter `links` as generic `relates_to`
relationships during `kibi sync`, and fix `kibi query --relationships` so it
returns outgoing relationships reliably.
