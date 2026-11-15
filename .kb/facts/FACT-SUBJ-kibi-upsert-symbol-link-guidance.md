---
title: Symbol link and upsert error guidance
status: active
fact_kind: subject
subject_key: kibi.upsert.symbol_link_guidance
tags:
  - strict-lane
origin:
  kind: agent
  recorded_at: '2026-10-15T16:05:04.849Z'
id: FACT-SUBJ-kibi-upsert-symbol-link-guidance
type: fact
---

How symbol links are judged at write time and how kb_upsert and symbol-coverage errors name the missing step: a coarse symbol link is refused when written, judged against the stored symbol's source, and an invalid payload is returned as an error envelope. It is guidance and refusal at write time, not the check-time rule.
