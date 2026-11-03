---
title: The kibi-claude plugin bundles the seven Kibi skills
status: active
fact_kind: property_value
subject_key: claude.kibi_plugin
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
claim_text: The kibi-claude plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others
text_ref: REQ-claude-plugin-package
origin:
  kind: agent
  recorded_at: '2026-10-27T07:43:08.778Z'
claim_key: CLAIM-356FB1F64A34B134
id: FACT-claude-bundled-skills
type: fact
---
Each bundled skill is a skills/<name>/SKILL.md file in the package.