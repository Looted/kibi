---
title: A requirement's subject key becomes the predicate subject
status: active
priority: must
tags:
  - modeling
  - predicates
  - bindings
origin:
  kind: agent
  recorded_at: '2026-10-08T15:34:45.820Z'
id: SCEN-model-predicates-requirement-subject
type: scenario
---
Given a requirement that constrains a semantic subject fact keyed `x.y`, when the agent calls `kb_model` mode `predicates` with its `requirementId` and no `subjectHint`, the candidate predicate's first argument is `x.y` with provenance `requirement`, and no `bindingHints` entry asks for the subject. An explicit `subjectHint` still wins; a requirement with several subject facts gets each subject key first in the subject's binding examples; a requirement with no subject fact leaves `subject` unbound instead of guessing `editor.annotation`.

An onboarding evaluation found predicates and subject facts naming one subject with a different key each.