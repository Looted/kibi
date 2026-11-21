---
title: The launcher may treat the bare spawn cwd as the Kibi workspace
status: active
fact_kind: property_value
subject_key: kibi.vibe.workspace_resolution
property_key: the-launcher-must-resolve-the-workspace
operator: eq
value_type: bool
value_bool: false
origin:
  kind: agent
  recorded_at: '2026-11-19T22:37:16.229Z'
id: FACT-NEG-VIBE-WORKSPACE-CWD-ONLY
type: fact
---
Opposing assumption for the negative scenario of REQ-vibe-workspace-resolution: assumes kibi.vibe.workspace_resolution.the-launcher-must-resolve-the-workspace is false, which REQ-vibe-workspace-resolution forbids.