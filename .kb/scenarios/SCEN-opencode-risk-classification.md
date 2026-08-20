---
id: SCEN-opencode-risk-classification
title: OpenCode Risk Class Triggers
type: scenario
status: active
created_at: 2026-05-13T00:00:00Z
source: documentation/scenarios/SCEN-opencode-risk-classification.md
priority: must
tags:
  - enforcement
  - opencode
  - risk
links:
  - type: verified_by
    target: TEST-opencode-smart-enforcement
---

## Scenario: Risk Class Triggers

Every proposed edit or action must be classified to determine the enforcement level.

### Risk Class Triggers
**Given** the posture is `root_active`
**When** an agent edits a file in `src/` without adding `// implements REQ-xxx`
**Then** the plugin must classify this as `traceability_candidate`
**And** inject guidance nudging the agent to add requirement links.

**When** an agent edits a file in `documentation/requirements/`
**Then** the plugin must classify this as `req_policy_candidate`
**And** inject guidance about SCEN/TEST separation.

**When** an agent attempts to edit a file under `.kb/relationships/`
**Then** the plugin must classify this as `manual_kb_edit`
**And** emit a loud warning directing the agent to use `kb_upsert` or `kb_delete`.
