---
title: Host hooks count a shell in-place edit as an edit
status: active
fact_kind: property_value
subject_key: kibi.host.hook_inputs
property_key: shell_in_place_edit_counts_as_edit
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-19F6C81E1C710C8C
claim_text: Every host hook with a shell tool must count an in-place edit through that tool, such as sed -i, a redirection, tee or the same inside a shell -c script, as an edit of the files it writes
text_ref: REQ-agent-hosts-shell-edits-count
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-17T17:07:46.948Z'
id: FACT-shell-in-place-edit-counts
type: fact
---
