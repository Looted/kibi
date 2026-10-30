---
title: An untranslatable conditional compiles to no rule and no observation and stays an open ontology gap
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:08:31.643Z'
id: SCEN-NEG-kibi-conditional-requirement-authoring-untranslatable-conditional
type: scenario
---
Given a requirement whose conditional clause names a condition Kibi cannot translate into a single comparison, when kb_compile_intent compiles it through the CLI, then no rule and no observation are produced, the clause stays an ontology_gap proposition, and the plan status is needs_resolution instead of ready.

This is the failure side of conditional authoring: a conditional Kibi cannot model must stay a visible gap rather than a note that looks modeled. packages/cli/tests/consumer/conditional-feasibility.test.ts "a compiled rule decides only scenarios inside its validity window, and an untranslatable conditional stays an open gap" exercises it.
