---
title: logical_requirement_rule arguments are prose-like atoms
status: active
fact_kind: observation
tags:
  - vocabulary
  - follow-up
  - ontology-quality
  - review:ontology-gap
id: FACT-OBS-logical-requirement-rule-prose-followup
type: fact
---
Observation: ontology-quality flags logical_requirement_rule/3 in two places. The schema-backed facts (97 facts) have 88% singleton argument values, and 19 facts in the default namespace have 77%. The arguments encode per-requirement prose, so paraphrases never unify and redundancy checks cannot see them. The same predicate also appears across several namespaces. A follow-up should split the rule into reusable argument vocabularies (or allowed constants per argument) and move the stray default-namespace facts under the schema's namespace.
