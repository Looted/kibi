---
"kibi-cli": patch
"kibi-core": patch
"kibi-mcp": patch
---

Accept `sourceFile` as an optional entity property during `kb_upsert`.

- Allows symbol (and other) entities to include `sourceFile` in `properties` without triggering JSON schema validation errors.
- Adds `sourceFile` to the JSON entity schema and the Prolog entity schema.
- Adds regression test for symbol upsert with `sourceFile`.

Fixes #114.
