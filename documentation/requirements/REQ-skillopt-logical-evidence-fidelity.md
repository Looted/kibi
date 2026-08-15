---
id: REQ-skillopt-logical-evidence-fidelity
title: Skillopt logical evidence and feedback remain semantically faithful
status: open
created_at: 2026-08-04T00:00:00.000Z
updated_at: 2026-08-04T00:00:00.000Z
source: documentation/requirements/REQ-skillopt-logical-evidence-fidelity.md
priority: must
tags:
  - skillopt
  - evaluation
  - predicates
  - evidence
  - feedback
  - umbrella
logic_claims:
  - CLAIM-D593FEA65D7C463C
  - CLAIM-87DBE563B1D0DDDC
  - CLAIM-0587E4B2168FD2B6
  - CLAIM-368FEE750F2FC6BA
  - CLAIM-7D9BC2D21690A9A7
  - CLAIM-34B395C24CBD6107
  - CLAIM-DE4082419A031E05
links:
  - type: specified_by
    target: SCEN-skillopt-logical-evidence-fidelity
  - type: verified_by
    target: TEST-skillopt-logical-evidence-fidelity
  - type: requires_predicate
    target: FACT-SKILLOPT-FINAL-PROPERTY-KEY
  - type: requires_predicate
    target: FACT-SKILLOPT-QUERY-MULTI-TARGET
  - type: requires_predicate
    target: FACT-SKILLOPT-SAFE-FIXTURE-EVIDENCE
  - type: requires_predicate
    target: FACT-SKILLOPT-SAFE-FINAL-STATE
  - type: requires_predicate
    target: FACT-SKILLOPT-PROVIDER-BUDGET
  - type: requires_predicate
    target: FACT-SKILLOPT-FEEDBACK-CATEGORY
  - type: requires_predicate
    target: FACT-SKILLOPT-SEMANTIC-READINESS
  - type: relates_to
    target: REQ-skillopt-codex-optimization
  - type: relates_to
    target: REQ-skillopt-predicate-first-requirements
type: req
---

Final-state property evidence must preserve the stored property_key without deriving a namespace from subject_key.

Exact entity queries must preserve every target when a relationship type occurs more than once.

Safe-mutation evaluation fixtures must expose the requested typed relationships and the real test evidence needed to close symbol coverage.

Safe-mutation final-state scoring must verify the exact requested ownership and coverage relationships.

Provider credit or usage exhaustion must terminate paid optimization as budget-exhausted infrastructure evidence.

Behavioral failures without critical failures must retain a structured feedback category for the optimizer.

Semantic-advisor readiness must remain partial until every normative claim has a distinct logical grounding edge.

These seven clauses form the complete logical representation of this requirement. They use the project-local `evaluation_evidence_rule(component, condition, outcome)` schema because low-confidence built-in matches such as state or retention rules do not preserve the evaluator semantics.
