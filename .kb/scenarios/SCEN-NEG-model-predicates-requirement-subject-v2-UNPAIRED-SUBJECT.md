---
title: A predicate about a subject the requirement does not constrain is not offered for grounding
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:03:21.536Z'
id: SCEN-NEG-model-predicates-requirement-subject-v2-UNPAIRED-SUBJECT
type: scenario
---
Given a requirement that constrains the subject x.y, when an agent runs predicate modeling with subjectHint editor.session, then the candidate is unpaired and incomplete, no apply plan is returned, the action is provide_argument_bindings and the subject hint says editor.session is not a subject the requirement constrains, offering x.y first.

This is the failure side of subject pairing: a predicate about another component must not ground a requirement, because kb_check would report the pair as unmatched. packages/cli/tests/operations/suggest-predicates-existing-grounding.test.ts "subjectHint wins over the constrained subject, but a predicate about another subject is not offered for grounding" exercises it.
