---
title: The derived KB folders shall be .kb/branches, .kb/recovery, .kb/proof/runs, .kb/briefs and .kb/migrations
status: active
fact_kind: property_value
subject_key: kibi.kb_layout.paths
claim_key: CLAIM-E2AE94CB45988C06
claim_text: The derived KB folders shall be .kb/branches, .kb/recovery, .kb/proof/runs, .kb/briefs and .kb/migrations
text_ref: REQ-cli-kb-layout-paths
property_key: derived_folders
operator: eq
value_type: set
value_set:
  - .kb/branches
  - .kb/recovery
  - .kb/proof/runs
  - .kb/briefs
  - .kb/migrations
origin:
  kind: agent
  recorded_at: '2026-10-28T19:00:57.239Z'
id: FACT-derived-kb-prefixes
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.