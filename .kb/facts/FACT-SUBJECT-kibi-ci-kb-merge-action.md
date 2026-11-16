---
title: Kibi KB merge action
status: active
fact_kind: subject
subject_key: kibi.ci.kb_merge_action
canonical_key: kibi.ci.kb_merge_action
text_ref: actions/kb-merge/kb-merge.sh
tags:
  - ci
  - merge
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:13.890Z'
id: FACT-SUBJECT-kibi-ci-kb-merge-action
type: fact
---
The GitHub Action at actions/kb-merge (script actions/kb-merge/kb-merge.sh) that merges the base branch into open pull requests whose only conflicts are Kibi manifests, using kibi merge-driver, and pushes the merge after kibi sync and a check pass. Kibi ships it to consumers and runs it in its own KB merge workflow.