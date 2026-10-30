---
title: kibi report is asked to build requirement health from a coverage page that holds fewer rows than there are requirements
status: active
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.report.html
  - require_complete_requirement_rows
  - fail_closed_on_partial_health_metrics
polarity: deny
predicate_namespace: kibi.requirements
canonical_key: logical_requirement_rule(kibi.report.html,require_complete_requirement_rows,fail_closed_on_partial_health_metrics)
origin:
  kind: agent
  recorded_at: '2026-10-29T21:34:33.790Z'
id: FACT-NEG-kibi-html-health-report-partial-coverage-page
type: fact
---
