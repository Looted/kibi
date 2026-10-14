---
title: The first commit after kibi migrate
status: active
fact_kind: subject
subject_key: kibi.migration.first_commit
tags:
  - strict-modeling
  - lane:strict
origin:
  kind: agent
  recorded_at: '2026-10-14T08:43:59.382Z'
id: FACT-SUBJ-cli-migration-first-commit
type: fact
---
The commit that records a `kibi migrate` run: the moved and rewritten knowledge files, the regenerated symbol coordinates and the raised schema generation in `.kb/manifest.json`. The pre-commit hook judges it with `kibi check-generated --staged` and `kibi check --staged`.
