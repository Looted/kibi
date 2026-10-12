---
title: A check reports the rules it evaluated and the fact pairs its contradiction rule compared
status: active
tags:
  - lane:ontology
  - checks
  - search-lane
text_ref: .kb/requirements/REQ-search-answer-hygiene.md
fact_kind: predicate
polarity: assert
canonical_key: logical_requirement_rule(kibi.checks.core_rules,check_run_completed,evaluated_rules_and_fact_pairs_reported)
claim_key: CLAIM-A6A0815BED6913CE
claim_text: A kb_check result must report the rules it evaluated and the number of requirement fact pairs the domain-contradictions rule compared
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.checks.core_rules
  - check_run_completed
  - evaluated_rules_and_fact_pairs_reported
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-11T19:53:28.310Z'
id: FACT-CHECK-EVALUATED-REPORT
type: fact
---
Every kb_check result carries `evaluated.rules`, the rule names that ran, and when `domain-contradictions` ran, `evaluated.domainContradictions.factPairsExamined`, the number of distinct requirement fact pairs the rule compared, read from `kb_domain_contradiction_pairs_examined/1` after the rules ran; the text summary repeats it, so no violations over zero pairs reads as nothing compared, not as consistency.

## Context

Search-lane round 1 on the test project (A8): `kb_check` with `domain-contradictions` returned zero violations on a KB where no two requirements constrained the same case, and nothing in the response distinguished that from a consistency result. Asked by the project owner through the search-lane fix PRs (fix 5).