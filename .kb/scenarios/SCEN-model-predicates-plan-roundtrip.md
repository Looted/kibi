---
title: Predicate modeling plans are applied through MCP exactly as returned
status: active
priority: must
tags:
  - modeling
  - predicates
  - mcp
origin:
  kind: agent
  recorded_at: '2026-10-08T08:33:06.132Z'
id: SCEN-model-predicates-plan-roundtrip
type: scenario
---
Given a requirement that already grounds its claim through `requires_property`, when the agent calls `kb_model` mode `predicates` for a claim no predicate schema fits, it gets `record_ontology_gap` and applies the returned observation with `kb_upsert` unchanged: the observation is tagged `review:ontology-gap`, quotes the claim in `claim_text` without a `claim_key`, explains itself in `document.body`, has no relationships, and `kb_check` reports nothing for it. For a claim with a complete predicate candidate it gets `replace_grounding` and applies the `replacementPlan` steps unchanged in order (upsert the predicate fact, `kb_delete` the `requires_property` link, upsert the requirement with `requires_predicate`); `kb_check` reports `logic-coverage` only between the second and third step, and afterwards the requirement grounds the claim through the predicate with its title, status and tags intact.

An onboarding evaluation found that the gap plan from kb_model was rejected by kb_upsert every time.