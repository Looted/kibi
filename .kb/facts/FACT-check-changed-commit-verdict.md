---
title: kb_check changed:true gives the commit gate's verdict before staging
status: active
fact_kind: property_value
subject_key: kibi.check
property_key: changed_check_verdicts_unlike_gate
operator: eq
value_type: int
value_int: 0
tags:
  - lane:strict
  - fact:property_value
  - check
  - staged
origin:
  kind: agent
  recorded_at: '2026-11-16T18:30:00.000Z'
claim_key: CLAIM-BB361CC43477AFD9
claim_text: kb_check with changed:true and kibi check --changed must judge a commit of the working tree plus the index by the commit gate's rules, must leave the real index unchanged, and when given source files must add only those files and the knowledge base to the index it judges
id: FACT-check-changed-commit-verdict
type: fact
text_ref: REQ-check-changed-commit-verdict
---
The grounded claim of REQ-check-changed-commit-verdict: kb_check with changed:true and kibi check --changed must judge a commit of the working tree plus the index by the commit gate's rules, must leave the real index unchanged, and when given source files must add only those files and the knowledge base to the index it judges.