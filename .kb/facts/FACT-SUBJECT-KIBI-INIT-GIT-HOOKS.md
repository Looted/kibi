---
title: Kibi Init Git Hooks
status: active
tags:
  - strict-modeling
  - zcode
  - lane:strict
  - fact:subject
fact_kind: subject
subject_key: kibi.cli.init.git_hooks
canonical_key: kibi_init_git_hooks
id: FACT-SUBJECT-KIBI-INIT-GIT-HOOKS
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

The git hooks kibi init installs at the effective repository path for hard enforcement, leaving foreign hooks untouched and reporting each hook truthfully, with doctor diagnosing them. Agent host hooks are advisory and separate.
