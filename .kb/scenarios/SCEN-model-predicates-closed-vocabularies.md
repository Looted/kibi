---
title: An unbound trigger lists its allowed constants
status: active
priority: must
tags:
  - modeling
  - predicates
  - vocabulary
origin:
  kind: agent
  recorded_at: '2026-10-08T15:34:57.174Z'
id: SCEN-model-predicates-closed-vocabularies
type: scenario
---
Given the claim "The editor must save the draft when the user leaves." and the built-in `commit_action` predicate schema for semantic facts, when the agent calls `kb_model` mode `predicates`, the action is `provide_argument_bindings` and the `trigger` binding hint lists `allowedValues` `escape`, `cancel`, `submit`, `navigation`, `click`, `timeout`. A claim saying "when the session times out" binds `timeout`, "must be denied" binds the decision `deny`, an explicit `navigate` converges onto `navigation`, and every declared vocabulary is valid and matches the schema's own examples.

An onboarding evaluation found no allowed values in any binding hint.