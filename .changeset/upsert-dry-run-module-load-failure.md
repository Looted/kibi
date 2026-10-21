---
"kibi-cli": patch
"kibi-runtime": patch
"kibi-mcp": patch
---

`kb_upsert` with `dryRun: true` no longer reports a broken installation as an invalid payload. When a module Kibi needs for validation cannot be loaded, the dry run now fails as a tool error that names the missing module, instead of answering "payload is invalid" with no way to fix the payload.
