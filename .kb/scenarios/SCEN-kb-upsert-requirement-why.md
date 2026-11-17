---
title: A requirement written with why records its reason
status: active
expects: success
tags:
  - kb_upsert
  - rationale
priority: must
origin:
  kind: agent
  recorded_at: '2026-11-16T16:11:26.557Z'
id: SCEN-kb-upsert-requirement-why
type: scenario
---
Given a requirement kb_upsert with a statement body, a why and an origin.ref, when it is written, then the requirement records the why as its rationale, its body has a Context section with the why and a Source section with the origin.ref text, and its semantic_text is the statement.