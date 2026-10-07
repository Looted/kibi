---
title: Predicate modeling on a grounded requirement still reports gaps and missing bindings
status: active
priority: must
tags:
  - modeling
  - predicates
  - grounding
origin:
  kind: agent
  recorded_at: '2026-10-07T19:00:23.426Z'
id: SCEN-model-predicates-grounded-claim-state
type: scenario
---
Given a requirement that already grounds its claim through a `requires_property` fact, when the agent runs `kb_model` with `mode: "predicates"` and the requirement id:

- with no fitting predicate schema, the action is `record_ontology_gap` and the `review:ontology-gap` observation plan and schema draft are returned;
- with a fitting schema that lacks exact values, the action is `provide_argument_bindings` and the unbound arguments are named;
- with a complete candidate, the action is `replace_grounding` with a `replacementPlan` and no second grounding link.

In every case `existingGrounding` lists the existing link, and the replacement warning appears only when a replacement plan exists.

An onboarding evaluation showed the previous single `already_grounded` answer hid ontology gaps for every bootstrapped requirement.
