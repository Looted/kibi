---
title: kibi in a subdirectory subject
status: active
fact_kind: subject
subject_key: cli.subdirectory_workspace
canonical_key: cli.subdirectory_workspace
text_ref: REQ-cli-subdirectory-workspace
tags:
  - strict-modeling
  - lane:strict
  - fact:subject
origin:
  kind: agent
  recorded_at: '2026-10-26T13:32:28.472Z'
id: FACT-SUBJECT-CLI-SUBDIRECTORY-WORKSPACE
type: fact
---

Running a kibi command from a subdirectory of a Kibi workspace: it uses the workspace's knowledge base rather than creating an empty one there, and relative path options resolve from the directory where the command was typed. It is workspace resolution, not branch selection.
