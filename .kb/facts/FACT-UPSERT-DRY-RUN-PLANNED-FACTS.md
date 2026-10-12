---
title: A requirement dry run stages its planned facts before grounding and the contradiction preview
status: active
tags:
  - lane:ontology
  - mutation
  - search-lane
text_ref: .kb/requirements/REQ-model-what-if-planned-facts.md
fact_kind: predicate
polarity: assert
canonical_key: logical_requirement_rule(kibi.checks.contradictions,requirement_dry_run_with_planned_facts,staged_before_grounding_and_preview)
claim_key: CLAIM-CB0E6F78C31F52FE
claim_text: A kb_upsert dry run of a requirement must stage its planned facts before validating the grounding and previewing contradictions
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.checks.contradictions
  - requirement_dry_run_with_planned_facts
  - staged_before_grounding_and_preview
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-11T19:11:02.506Z'
id: FACT-UPSERT-DRY-RUN-PLANNED-FACTS
type: fact
---
kb_upsert with dryRun and plannedFacts validates the planned fact writes in order against the KB plus the facts before them, then validates the requirement with those facts staged (grounding targets resolve, claim keys are read from the plan) and previews contradictions over the staged batch in a rolled-back transaction.

## Context

Search-lane round 1 on the test project (A10 what-if): a requirement dry run failed on "logical grounding target … must declare a claim_key" before any contradiction check could run, because the planned fact did not exist yet. Asked by the project owner through the search-lane fix PRs.
