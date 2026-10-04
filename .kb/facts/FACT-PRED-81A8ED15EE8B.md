---
title: HTML report opens only after a successful write
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
  - launch_only_after_successful_write
  - generated_file_in_default_browser
canonical_key: logical_requirement_rule(kibi.report.html,launch_only_after_successful_write,generated_file_in_default_browser)
polarity: assert
claim_key: CLAIM-31FEA3FB7DDEB58C
claim_text: The open option must launch the generated file in the default browser only after a successful write
id: FACT-PRED-81A8ED15EE8B
type: fact
predicate_namespace: kibi.requirements
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Ground representation of one atomic behavior in the Kibi HTML requirement-health report.