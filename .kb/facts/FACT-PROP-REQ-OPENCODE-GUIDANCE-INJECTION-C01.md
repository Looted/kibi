---
title: Opencode guidance stays within five bullets per injection
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: opencode.kibi_plugin
property_key: guidance_bullets_per_injection
operator: lte
value_type: int
value_int: 5
canonical_key: opencode.kibi_plugin:guidance_bullets_per_injection:lte:5
polarity: require
claim_key: CLAIM-866ED9C456D0F81B
claim_text: The plugin must inject context-aware Kibi guidance into the session flow:\n\nSurface relevant requirements and traceability context to agents.\nLimit guidance to at most one block per injection, capped at 5 bullets or 120 words.\nInclude targeted nudges for code traceability (`implements REQ-xxx`).\nProvide file lifecycle context (create, edit, delete guidance).\nAppend completion reminders (`Run kb_check before completing...`) for behavior candidates
id: FACT-PROP-REQ-OPENCODE-GUIDANCE-INJECTION-C01
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
