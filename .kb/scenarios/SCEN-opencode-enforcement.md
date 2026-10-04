---
id: SCEN-opencode-enforcement
title: OpenCode plugin enforces Kibi-first behaviors
type: scenario
status: active
created_at: 2026-03-17T00:00:00.000Z
updated_at: 2026-03-22T00:00:00.000Z
source: .kb/scenarios/SCEN-opencode-enforcement.md
priority: must
tags:
  - enforcement
  - opencode
  - kibi-first
  - guidance
links:
  - type: relates_to
    target: SCEN-opencode-smart-enforcement
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
When OpenCode guidance detects repository work, it reads the typed Kibi status and next actions. General work follows the canonical usage, freshness, and traceability skills; an explicit bootstrap request routes to the kibi-bootstrap skill and its returned plan. The host uses the approved peer surface and never edits .kb directly.
