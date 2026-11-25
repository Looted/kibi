---
title: A registry rule without a layer is refused
status: active
expects: rejection
text_ref: packages/core/schema/rule-registry.json
tags:
  - negative-path
  - check
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T08:36:21.000Z'
id: SCEN-NEG-kibi-check-rule-layers-unlayered-rule
type: scenario
---
Given a check rule in the rule registry that declares no layer, the registry generator and the rule-layer checks reject the registry, because every rule must be knowledge or verification.
