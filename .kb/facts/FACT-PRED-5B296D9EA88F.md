---
title: HTML report is safe and network independent
status: active
text_ref: documentation/requirements/REQ-kibi-html-health-report.md
tags:
  - lane:ontology
  - requirements
  - report
  - cli
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.report.html
  - render_untrusted_knowledge_text
  - html_escaped_and_network_independent
canonical_key: logical_requirement_rule(kibi.report.html,render_untrusted_knowledge_text,html_escaped_and_network_independent)
polarity: assert
claim_key: CLAIM-59CFEDCE5CE79A3C
claim_text: The report must escape knowledge-base text and work without network assets
id: FACT-PRED-5B296D9EA88F
type: fact
predicate_namespace: kibi.requirements
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Ground representation of one atomic behavior in the Kibi HTML requirement-health report.