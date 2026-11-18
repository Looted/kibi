---
"kibi-agent-core": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-opencode": patch
"kibi-zcode": patch
---

A requirement written through the CLI (`kibi record`, or `kibi upsert` of a requirement) now raises the end-of-session signoff reminder on every host, as one written through `kb_record` or `kb_upsert` already did.
