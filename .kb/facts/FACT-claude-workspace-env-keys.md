---
title: A Claude plugin workspace variable shall be KIBI_WORKSPACE, KIBI_PROJECT_ROOT or KIBI_ROOT
status: active
fact_kind: property_value
subject_key: kibi.agent_plugins.workspace_keys
claim_key: CLAIM-CB8FD3DDEA956390
claim_text: A Claude plugin workspace variable shall be KIBI_WORKSPACE, KIBI_PROJECT_ROOT or KIBI_ROOT
text_ref: REQ-agent-workspace-opt-in-keys
property_key: claude_workspace_keys
operator: eq
value_type: set
value_set:
  - KIBI_WORKSPACE
  - KIBI_PROJECT_ROOT
  - KIBI_ROOT
origin:
  kind: agent
  recorded_at: '2026-10-29T16:33:24.974Z'
id: FACT-claude-workspace-env-keys
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.