---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-runtime": patch
---

kb_upsert no longer overwrites another entity's document: a `document.path` naming a file that already holds a different entity is refused with `SOURCE_ENTITY_MISMATCH` (before, the other entity silently disappeared from the sources and its links dangled). Entity ids must be file-name-safe (no whitespace, control characters or path separators), and a requirement that `supersedes` itself is refused.
