---
title: Read and search hooks show the requirements of the code in view
status: active
fact_kind: property_value
subject_key: kibi.host.read_rows
property_key: requirements_in_view_left_unshown
operator: eq
value_type: int
value_int: 0
text_ref: REQ-hook-read-rows-in-view
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-hook-read-rows-in-view
origin:
  kind: agent
  recorded_at: '2026-11-25T14:26:46.462Z'
id: FACT-hook-read-rows-in-view
type: fact
claim_key: CLAIM-257FD9480ADB62E6
claim_text: When the agent reads or searches source code through a read, search or shell tool, every host hook with such an event must show the requirements implemented by the symbols in view, which are the lines read, the lines a search matches, or the whole file when it implements at most 5 requirements, each as one compact row of id, firmness, title and implementing symbol, with the focused symbol's requirements first
---
