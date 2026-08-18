---
id: FACT-JOURNALED-ENGINE-DELTA-SYNC
title: Normal sync applies deltas without replacing generations
status: active
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
source: packages/cli/src/commands/sync.ts
tags: [lane:ontology, engine, sync, compaction]
fact_kind: predicate
predicate_namespace: kibi.engine
predicate_name: logical_requirement_rule
predicate_args: [normal_sync, changed_inputs_only, rebuild_replaces_generation]
canonical_key: logical_requirement_rule(normal_sync,changed_inputs_only,rebuild_replaces_generation)
polarity: assert
claim_key: CLAIM-A7612F59AFB9BF9A
claim_text: Normal sync MUST compile only changed source entities relationship shards and deletions into journaled transactions while sync --rebuild is the only generation-replacement path and idle compaction is available
claim_span_start: 618
claim_span_end: 827
---

Ground representation of delta sync, rebuild, and idle-compaction behavior.
