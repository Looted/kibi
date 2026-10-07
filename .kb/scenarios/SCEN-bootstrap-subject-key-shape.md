---
title: Bootstrap plans subject keys as component.aspect and keeps stated rationale
status: active
priority: must
tags:
  - bootstrap
  - modeling
  - subject-keys
origin:
  kind: agent
  recorded_at: '2026-10-07T19:01:49.807Z'
id: SCEN-bootstrap-subject-key-shape
type: scenario
---
Given a declared knowledge source with `component: recorder` and the intent claim "Beginning to record while idle must start a new take.", when the agent previews `kb_plan_bootstrap`, the planned subject and property facts use the subject key `recorder.beginning_to_record_while_idle`. Without a component the claim is listed in `diagnostics` and as an authoring follow-up, with no requirement and no malformed key. A claim that declares a `rationale` plans a requirement with that `rationale` and a `## Context` section; a claim without one gets none invented.

An onboarding evaluation found every bootstrapped requirement flagged by `subject-key-shape`.
