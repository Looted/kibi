---
title: The kibi-zcode plugin bundles the seven Kibi skills
status: active
fact_kind: property_value
subject_key: zcode.kibi_adapter
property_key: bundled_skills
operator: eq
value_type: set
value_set:
  - kibi-bootstrap
  - kibi-commit-review
  - kibi-decisions
  - kibi-freshness
  - kibi-provable-code
  - kibi-traceability
  - kibi-usage
claim_text: The kibi-zcode plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others
text_ref: REQ-zcode-plugin-package
origin:
  kind: agent
  recorded_at: '2026-10-27T07:26:43.561Z'
claim_key: CLAIM-5982BDE99889016F
distinct_from:
  - claude.kibi_plugin.bundled_skills
id: FACT-zcode-bundled-skills
type: fact
---
The ZCode plugin bundles the canonical Kibi agent skills as skill directories with a SKILL.md each.

Each plugin package bundles its own copy of the skills, so the ZCode list is checked against the ZCode package and the Claude list against the Claude package. They are equal because both packages ship every skill, not because one list is the other.
