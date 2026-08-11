---
id: FACT-AUDIT-LOCK-PROBE
title: Upsert probes stale audit locks before RDF mutation
status: active
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
source: documentation/facts/FACT-AUDIT-LOCK-PROBE.md
tags: [lane:ontology, audit, locking, stale-runtime]
fact_kind: predicate
predicate_namespace: kibi.audit
predicate_name: audit_lock_probe_fails_fast
predicate_args: [existing_journal, nonblocking, stale_runtime]
canonical_key: audit_lock_probe_fails_fast(existing_journal,nonblocking,stale_runtime)
polarity: assert
claim_key: CLAIM-6DD1D3C7DBACF786
claim_text: Before RDF mutation, a commit must probe an existing journal without waiting and return an actionable stale-runtime/lock error when an older Kibi process still owns the journal lock
claim_span_start: 483
claim_span_end: 664
---

Ground representation of the bounded stale-runtime lock failure.
