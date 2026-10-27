---
title: The kibi-claude plugin bundles the six Kibi skills
status: active
fact_kind: property_value
subject_key: claude.kibi_plugin
property_key: bundled_skills
operator: includes
value_type: set
value_set:
  - kibi-bootstrap
  - kibi-commit-review
  - kibi-decisions
  - kibi-freshness
  - kibi-traceability
  - kibi-usage
claim_text: The kibi-claude plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills
text_ref: REQ-claude-plugin-package
origin:
  kind: agent
  recorded_at: '2026-10-27T07:43:08.778Z'
claim_key: CLAIM-5B36379ABF96C3FD
id: FACT-claude-bundled-skills
type: fact
---
Each bundled skill is a skills/<name>/SKILL.md file in the package.