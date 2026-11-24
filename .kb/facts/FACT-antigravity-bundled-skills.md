---
claim_key: CLAIM-04AD5F15DC53AF27
claim_text: The kibi-antigravity plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others
fact_kind: property_value
operator: eq
origin:
  kind: agent
  recorded_at: '2026-11-22T05:11:48.928Z'
property_key: bundled_skills
status: active
subject_key: antigravity.kibi_plugin
text_ref: REQ-antigravity-plugin-package
title: The kibi-antigravity plugin bundles the seven Kibi skills
value_set:
  - kibi-bootstrap
  - kibi-commit-review
  - kibi-decisions
  - kibi-freshness
  - kibi-provable-code
  - kibi-traceability
  - kibi-usage
value_type: set
id: FACT-antigravity-bundled-skills
type: fact
distinct_from:
  - claude.kibi_plugin.bundled_skills
  - zcode.kibi_adapter.bundled_skills
---
Names the seven canonical Kibi skills mirrored into `packages/antigravity/skills/`. Distinct from `claude.kibi_plugin.bundled_skills` (`packages/claude/skills/`) and `zcode.kibi_adapter.bundled_skills` (`packages/zcode/skills/`), which govern separate host plugin packages with their own mirror directories and host-specific frontmatter rules.
