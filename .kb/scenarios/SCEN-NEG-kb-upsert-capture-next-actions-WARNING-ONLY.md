---
title: A blocking step left as a warning only is refused
status: active
expects: rejection
tags:
  - negative-path
priority: must
origin:
  kind: agent
  recorded_at: '2026-11-16T16:11:32.547Z'
id: SCEN-NEG-kb-upsert-capture-next-actions-WARNING-ONLY
type: scenario
---
Given a requirement write whose result reports a step kb_check blocks on only as a warning, when the result is checked, then it is refused: each such step must come back as a nextActions entry with a ready input.