---
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

The bundled `kibi-usage` skill (2.16.2) tells an agent that a `kb_search` answer may list only part of a requirement's facts (`moreFacts` names how many more and the `kb_query` that lists them), that `kb_model` mode `predicates` without a `requirementId` answers what a proposed rule would conflict with, writing nothing, and that `kb_query` with `includeBody: true` shows a requirement's authored prose.

Technical summary: the `skills/` mirrors in these packages are regenerated from the runtime skill canon; no code changes.
