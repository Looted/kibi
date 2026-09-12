---
"kibi-cli": patch
---

Upsert mutation rollback is now a declared compensation list instead of hand-tracked state. The upsert operation touches several workspace surfaces (authored document, relationship shards, generated symbol coordinates, compiled KB); when a commit fails, undoing those surfaces previously relied on a dozen local variables and duplicated rollback blocks inside the error handler. The steps now register named rollbacks as they succeed and one rollback pass walks them in reverse — with the same guarantees (hash-guarded shard restore, never clobbering concurrent writers, no rollback after the compiled commit). A failed rollback of the authored document now also aggregates its error with the original failure instead of hiding it.
