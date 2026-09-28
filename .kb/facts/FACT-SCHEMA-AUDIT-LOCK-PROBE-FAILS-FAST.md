---
title: Audit lock probes fail fast predicate schema
status: active
tags:
  - lane:ontology
  - predicate-schema
fact_kind: predicate_schema
predicate_namespace: kibi.audit
predicate_name: audit_lock_probe_fails_fast
predicate_arity: 3
argument_names:
  - journal_state
  - wait_mode
  - failure_cause
argument_types:
  - audit_resource
  - lock_wait_mode
  - lock_failure_cause
argument_descriptions:
  - Journal the commit probes before mutating.
  - How the probe waits for the lock.
  - Cause reported when the probe fails.
examples:
  - audit_lock_probe_fails_fast(existing_journal,nonblocking,stale_runtime)
id: FACT-SCHEMA-AUDIT-LOCK-PROBE-FAILS-FAST
type: fact
---
Predicate schema for audit_lock_probe_fails_fast/3.
