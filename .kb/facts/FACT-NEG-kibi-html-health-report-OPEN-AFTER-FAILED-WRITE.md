---
title: kibi report --open launches the browser although the report write failed
status: active
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.report.html
  - launch_only_after_successful_write
  - generated_file_in_default_browser
polarity: deny
predicate_namespace: kibi.requirements
canonical_key: logical_requirement_rule(kibi.report.html,launch_only_after_successful_write,generated_file_in_default_browser)
origin:
  kind: agent
  recorded_at: '2026-11-05T07:20:00.000Z'
id: FACT-NEG-kibi-html-health-report-OPEN-AFTER-FAILED-WRITE
type: fact
---
The output path cannot be written, and the open option still launches the default browser.
