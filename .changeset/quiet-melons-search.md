---
"kibi-core": patch
---

`kb_status` no longer wedges on large KBs after timestamp churn. Computing stale-source reasons ran one full entity-table scan per changed file, so a git checkout or branch switch that touched many authored files at once could make the status query — and every engine command that starts with it — hang for minutes on big knowledge bases. The status scan now builds the source-to-entity lookup in a single pass and finishes in about a second on the same state.
