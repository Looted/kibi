---
title: kibi init outside Git writes part of the workspace before it fails
status: active
fact_kind: property_value
subject_key: kibi.branch_attachment.outside_git
property_key: init_files_written
operator: gt
value_type: int
value_int: 0
origin:
  kind: agent
  recorded_at: '2026-11-25T07:11:52.985Z'
id: FACT-NEG-kibi-outside-git-init-writes
type: fact
---
kibi init in a workspace outside any Git repository writes part of .kb/ or other workspace files before it fails, leaving a half-initialized directory. The failure-side scenario of REQ-kibi-refuse-operation-workspace-outside-any assumes this state and expects init to write nothing.
