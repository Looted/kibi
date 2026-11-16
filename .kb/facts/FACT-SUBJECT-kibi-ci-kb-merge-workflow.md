---
title: Kibi KB merge workflow
status: active
fact_kind: subject
subject_key: kibi.ci.kb_merge_workflow
canonical_key: kibi_ci_kb_merge_workflow
origin:
  kind: agent
  recorded_at: '2026-10-28T09:39:42.651Z'
id: FACT-SUBJECT-kibi-ci-kb-merge-workflow
type: fact
---

The GitHub workflow (.github/workflows/kb-merge.yml) that keeps Kibi's own pull requests mergeable when only KB manifests conflict. It runs the Kibi KB merge action that Kibi ships to consumers (actions/kb-merge) with develop's Kibi build and the proof gate as its check.
