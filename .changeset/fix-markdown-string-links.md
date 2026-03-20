---
"kibi-cli": patch
"kibi-opencode": patch
---

Import plain string Markdown frontmatter `links` as generic `relates_to`
relationships during `kibi sync`, and fix `kibi query --relationships` so it
returns outgoing relationships reliably. Also fix `kibi-opencode` tarball ESM
imports and self-contained plugin typings so packed installs can build and load
the plugin and helper subpath exports in Node.
