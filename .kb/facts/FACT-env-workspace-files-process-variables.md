---
title: The project env file and the legacy .env file must not set a process-level variable such as PATH, NODE_OPTIONS or LD_PRELOAD
status: active
fact_kind: property_value
subject_key: kibi.env_bootstrap.workspace_files
property_key: process_variables_applied
operator: eq
value_type: bool
value_bool: false
claim_text: The project env file and the legacy .env file must not set a process-level variable such as PATH, NODE_OPTIONS or LD_PRELOAD
text_ref: REQ-kibi-env-workspace-file-key-policy
tags:
  - lane:strict
  - env
  - security
origin:
  kind: agent
  recorded_at: '2026-11-16T20:32:54.029Z'
claim_key: CLAIM-60D2681BD0D753C4
id: FACT-env-workspace-files-process-variables
type: fact
---
