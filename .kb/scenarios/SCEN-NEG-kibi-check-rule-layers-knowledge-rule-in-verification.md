---
title: A knowledge rule moved to the verification layer is refused
status: active
expects: rejection
text_ref: packages/core/schema/rule-registry.json
tags:
  - negative-path
  - check
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T08:36:26.574Z'
id: SCEN-NEG-kibi-check-rule-layers-knowledge-rule-in-verification
type: scenario
---
Given the registry places domain-contradictions in the verification layer, the rule-layer checks reject it, because the verification layer must hold only the six rules that ask for tests or proof.
