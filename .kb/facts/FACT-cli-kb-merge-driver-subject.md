---
title: Kibi KB manifest merge driver
status: active
fact_kind: subject
subject_key: kibi.cli.kb_merge_driver
canonical_key: kibi.cli.kb_merge_driver
text_ref: packages/cli/src/commands/merge-driver.ts
tags:
  - strict-modeling
  - lane:strict
  - fact:subject
id: FACT-cli-kb-merge-driver-subject
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

The kibi merge-driver command Git calls to merge Kibi YAML manifests (relationship shards, symbols) record by record id, so concurrent branches keep every record. It handles Kibi's manifest files only, not Markdown entities or source code.
