---
title: Kibi relationship types shall be depends_on, specified_by, verified_by, validates, implements, covered_by, executable_for, constrained_by, constrains, requires_property, requires_predicate, requires_rule, guards, publishes, consumes, supersedes, restates, assumes, exempts and relates_to
status: active
fact_kind: property_value
subject_key: kibi.relationships.vocabulary
claim_key: CLAIM-DB5C788DA756E5F2
claim_text: Kibi relationship types shall be depends_on, specified_by, verified_by, validates, implements, covered_by, executable_for, constrained_by, constrains, requires_property, requires_predicate, requires_rule, guards, publishes, consumes, supersedes, restates, assumes, exempts and relates_to
text_ref: REQ-kibi-relationship-type-vocabulary
property_key: relationship_types
operator: eq
value_type: set
value_set:
  - depends_on
  - specified_by
  - verified_by
  - validates
  - implements
  - covered_by
  - executable_for
  - constrained_by
  - constrains
  - requires_property
  - requires_predicate
  - requires_rule
  - guards
  - publishes
  - consumes
  - supersedes
  - restates
  - assumes
  - exempts
  - relates_to
origin:
  kind: agent
  recorded_at: '2026-10-28T10:21:37.417Z'
id: FACT-relationship-type-vocabulary
type: fact
---
RELATIONSHIP_TYPES in packages/cli/src/operations/mutation/relationships.ts is the list of relationship types kb_upsert accepts. REQ-005 names the first-class relationships, REQ-016 the supersedes chain between ADRs and REQ-kibi-restates-relationship the restates link; this requirement states the vocabulary they rely on so it is proved against the list itself, while what each relationship means stays in those requirements.