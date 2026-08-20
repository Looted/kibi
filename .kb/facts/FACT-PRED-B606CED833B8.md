---
title: HTML report fails closed on partial metrics
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
  - kibi_html_report_pagination
  - require_complete_requirement_rows
  - fail_closed_on_partial_health_metrics
canonical_key: logical_requirement_rule(kibi_html_report_pagination,require_complete_requirement_rows,fail_closed_on_partial_health_metrics)
polarity: assert
claim_key: CLAIM-8F61569C04F4BEF8
claim_text: Report generation must fail when pagination would make requirement-level health metrics incomplete
id: FACT-PRED-B606CED833B8
type: fact
---
Ground representation of one atomic behavior in the Kibi HTML requirement-health report.