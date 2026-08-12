---
id: FACT-JOURNALED-ENGINE-SINGLE-WRITER
title: One Node engine owns each workspace and branch
status: active
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
source: packages/cli/src/engine.ts
tags: [lane:ontology, engine, concurrency]
fact_kind: predicate
predicate_namespace: kibi.engine
predicate_name: logical_requirement_rule
predicate_args: [engine_scope, single_writer, one_per_workspace_branch]
canonical_key: logical_requirement_rule(engine_scope,single_writer,one_per_workspace_branch)
polarity: assert
claim_key: CLAIM-D1C9836C4BA9898F
claim_text: Kibi MUST run one Node.js 18+ single-writer engine for each canonical workspace and branch
claim_span_start: 0
claim_span_end: 90
---

Ground representation of the branch-local single-writer engine boundary.
