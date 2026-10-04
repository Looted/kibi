---
id: FACT-AUDIT-APPEND-CLOSE
title: Audit appends release the journal write lock
status: active
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
tags: [lane:ontology, audit, persistence, locking]
fact_kind: predicate
predicate_namespace: kibi.audit
predicate_name: audit_append_releases_write_lock
predicate_args: [audit_journal, every_append]
canonical_key: audit_append_releases_write_lock(audit_journal,every_append)
polarity: assert
claim_key: CLAIM-B08EED7571042B9C
claim_text: The persistent audit journal must release its write lock after every append
claim_span_start: 406
claim_span_end: 481
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of close-synchronized audit persistence.
