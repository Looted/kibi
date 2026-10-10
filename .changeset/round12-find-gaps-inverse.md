---
"kibi-core": patch
---

`kb_find_gaps` / `kibi find-gaps` no longer report a requirement or scenario as missing `verified_by` when a test links to it with the documented inverse edge `validates` (and a test linked by `verified_by` is no longer missing `validates`). Gap lists now agree with coverage rows, which already counted both directions.

Technical summary: `relationships_missing/2` and `relationships_present/2` in `discovery.pl` count a requested relationship together with its documented inverse (`verified_by` ↔ `validates`, the only inverse pair `docs/entity-schema.md` declares); `relationshipCounts` still reports each relationship name separately.
