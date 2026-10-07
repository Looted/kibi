---
title: Predicate modeling on a grounded requirement offers a swap, not a second link
status: active
priority: must
tags:
  - modeling
  - predicates
  - grounding
expects: success
origin:
  kind: agent
  recorded_at: '2026-10-07T12:28:51.646Z'
id: SCEN-model-predicates-grounding-aware
type: scenario
---
Given a requirement whose claim is grounded by a requires_property fact with the same claim key, when an agent runs kb_model with mode predicates and the requirement id, then the result is already_grounded with no apply plan or relationship plan, lists the existing grounding, and offers a replacement plan that writes the predicate fact, retracts the old link and links requires_predicate to the planned FACT-PRED id. Given an ungrounded claim, the plan's relationship target is the planned fact id and never a SUGGEST candidate id.

The case comes from an evaluation run that wrote predicate facts but no requires_predicate links.