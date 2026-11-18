---
title: The first edit snippet shown for a file whose lead requirement is current must give that requirement's recorded reason, or say that none is recorded, on one line starting with "Why:" inside the snippet's budget
status: active
fact_kind: property_value
subject_key: kibi.edit_snippet.requirement_reason
property_key: first_edit_snippets_without_why_line
operator: eq
value_type: int
value_int: 0
claim_text: The first edit snippet shown for a file whose lead requirement is current must give that requirement's recorded reason, or say that none is recorded, on one line starting with "Why:" inside the snippet's budget
text_ref: REQ-agent-core-edit-snippet-why
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-agent-core-edit-snippet-why
origin:
  kind: agent
  recorded_at: '2026-11-16T15:40:46.198Z'
claim_key: CLAIM-301D93AF3C0D044A
id: FACT-edit-snippet-why-line
type: fact
---
Counts first edit snippets for a file whose lead requirement is current that have no `Why:` line within the snippet budget; zero means the agent sees the reason, or that none is recorded, before it edits.