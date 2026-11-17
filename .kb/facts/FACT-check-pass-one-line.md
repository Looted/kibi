---
title: A passing check gives its verdict, rule count and symbol debt count on one line
status: active
fact_kind: property_value
subject_key: kibi.check
property_key: pass_verdict_lines
operator: eq
value_type: int
value_int: 1
tags:
  - lane:strict
  - fact:property_value
  - check
origin:
  kind: agent
  recorded_at: '2026-11-16T15:47:00.000Z'
claim_key: CLAIM-D681119B9237EF78
claim_text: A passing kibi check must give its verdict, the number of rules evaluated and the count of non-blocking unrecorded declarations on one line, and kb_check must report the evaluated rules as a count, naming them only when fewer than the default rules ran
text_ref: REQ-check-pass-one-line
id: FACT-check-pass-one-line
type: fact
---
A passing kibi check prints one verdict line with the rule count and the symbol debt count, and kb_check names the evaluated rules only when a default rule did not run. Grounds the clause of REQ-check-pass-one-line.