---
title: Schema-named bindings leave the predicate incomplete with typed hints
status: active
priority: must
tags:
  - modeling
  - predicates
  - bindings
origin:
  kind: agent
  recorded_at: '2026-10-08T08:34:18.731Z'
id: SCEN-model-predicates-binding-placeholders
type: scenario
---
Given the claim "Saved invoices should remain visible after a reload." and the `temporal_order` schema, when the agent calls `kb_model` mode `predicates` with `argumentBindings` `before_event: "before_event"` and `after_event: "after_event"`, the candidate stays `incomplete`, the action is `provide_argument_bindings`, no apply plan is returned, and `bindingHints` lists both arguments with type `event`, the schema's example values and the reason the value was refused. Bindings taken from the claim text (`reload`, `remain_visible`) complete the plan. `true`, `false` and declared `argument_constants` are always accepted.

An onboarding evaluation found replacement plans built from bindings that only repeated argument names.