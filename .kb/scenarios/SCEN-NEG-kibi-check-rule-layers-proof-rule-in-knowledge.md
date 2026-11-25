---
title: A proof rule left in the knowledge layer is refused
status: active
expects: rejection
text_ref: packages/core/schema/rule-registry.json
tags:
  - negative-path
  - check
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T08:36:23.765Z'
id: SCEN-NEG-kibi-check-rule-layers-proof-rule-in-knowledge
type: scenario
---
Given the registry places symbol-coverage in the knowledge layer, the rule-layer checks reject it, because the verification layer must hold every rule that asks for tests or proof.
