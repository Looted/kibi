---
title: MCP exposes bundled skill resources through discovery
status: active
tags:
  - strict-lane
fact_kind: subject
subject_key: kibi.skills.bundled
canonical_key: req.req_mcp_skills_resource_discoverability
id: FACT-SUBJ-REQ-MCP-SKILLS-RESOURCE-DISCOVERABILITY
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

The canonical agent skills Kibi bundles (seven, including kibi-provable-code) and the resources each declares, which MCP serves through discovery only for paths the skill manifest declares and never outside the skill directory. It excludes skills a project writes itself.
