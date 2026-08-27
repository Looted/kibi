---
id: FACT-PRED-AD0C672ED7B9
title: The explicit telemetry gate prints and exits conservatively
status: active
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/requirements/REQ-kibi-telemetry-acceptance-gate.md
tags: [lane:ontology, telemetry, cli, acceptance]
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args: [usage_metrics_acceptance_gate, exit_nonzero_unless_passed_and_print_report, enforced]
canonical_key: logical_requirement_rule(usage_metrics_acceptance_gate,exit_nonzero_unless_passed_and_print_report,enforced)
polarity: assert
claim_key: CLAIM-8BF5CD6FD8431A80
claim_text: kibi usage-metrics --require-acceptance must exit nonzero unless the overall status is passed while still printing the report
claim_span_start: 1197
claim_span_end: 1322
---

Ground representation of the machine-enforceable CLI gate.
