---
title: Only-when and must-not-unless prose compiles to one forbid rule and untranslatable conditionals stay open gaps
status: passing
tags:
  - modeling
  - semantic-advisor
  - compile-intent
  - conditional
  - rules
  - ontology-gap
verification_scope: unit
verification_perspective: internal
text_ref: packages/cli/tests/operations/semantic-advisor.test.ts; packages/cli/tests/operations/modeling.test.ts; packages/cli/tests/operations/compile-intent.test.ts
origin:
  kind: agent
  recorded_at: '2026-10-04T02:31:30.464Z'
id: TEST-kibi-conditional-requirement-authoring
type: test
---
# Only-when and must-not-unless prose compiles to one forbid rule and untranslatable conditionals stay open gaps

Runs `packages/cli/tests/operations/semantic-advisor.test.ts` (`routes only-when and must-not-unless prose to one forbid-unless rule`, `keeps a conditional it cannot translate as an unresolved ontology gap`, `keeps a catalog predicate for a conditional the rule reader cannot translate`), `packages/cli/tests/operations/modeling.test.ts` (`modelRequirementSpec models a conditional as a typed rule, not a property`, `modelRequirementSpec leaves an untranslatable conditional unresolved` with the `unresolved_conditional_clause` warning, `modelRequirementSpec keeps a below-threshold observation an open gap`) and `packages/cli/tests/operations/compile-intent.test.ts` (`compiles only-when prose to a forbid-unless rule plan`, `compiles must-not-unless prose to the same rule`, `leaves a conditional it cannot translate unresolved`).
