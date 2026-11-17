---
title: A requirement's recorded reason in a kb_search answer or in an edit snippet's Why line must leave out each line that only records a split or supersession, such as "Split from REQ-…" or "Superseded by …"
status: active
fact_kind: property_value
subject_key: kibi.search_answer.requirement_reasons
property_key: reasons_quoting_split_or_supersede_notes
operator: eq
value_type: int
value_int: 0
claim_text: A requirement's recorded reason in a kb_search answer or in an edit snippet's Why line must leave out each line that only records a split or supersession, such as "Split from REQ-…" or "Superseded by …"
text_ref: REQ-requirement-reason-skips-change-notes
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-requirement-reason-skips-change-notes
origin:
  kind: agent
  recorded_at: '2026-11-16T17:36:35.886Z'
claim_key: CLAIM-2A0CD7868104DEE1
id: FACT-requirement-reason-change-notes
type: fact
---
Counts recorded reasons, in a kb_search answer or on an edit snippet's Why line, whose text includes a line that only says the requirement was split from or superseded by another; zero means each reason says why the rule exists.