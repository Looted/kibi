---
title: A failed engine transaction leaves part of its writes behind
status: active
tags:
  - negative-path
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.engine.journal
  - atomic_domain_audit_metadata
  - acknowledge_after_journal_durable
polarity: deny
canonical_key: logical_requirement_rule(kibi.engine.journal,atomic_domain_audit_metadata,acknowledge_after_journal_durable)
origin:
  kind: agent
  recorded_at: '2026-11-10T12:00:00.000Z'
id: FACT-NEG-kibi-engine-durable-transactions-PARTIAL-COMMIT
type: fact
---
An engine transaction that fails part way leaves its entity triples or its audit record in the branch store.
