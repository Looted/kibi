---
title: Every kb_check finding says what it blocks
status: active
fact_kind: property_value
subject_key: kibi.check
property_key: check_findings_without_blocks
operator: eq
value_type: int
value_int: 0
tags:
  - lane:strict
  - fact:property_value
  - check
origin:
  kind: agent
  recorded_at: '2026-11-16T18:30:00.000Z'
claim_key: CLAIM-230C174F21872A17
claim_text: Each finding that kb_check returns must carry a blocks field that is commit when the commit gate refuses a commit over it, merge when the full check fails over it, and none when it is advice
id: FACT-check-finding-blocks
type: fact
text_ref: REQ-check-finding-blocks
---
The grounded claim of REQ-check-finding-blocks: Each finding that kb_check returns must carry a blocks field that is commit when the commit gate refuses a commit over it, merge when the full check fails over it, and none when it is advice.