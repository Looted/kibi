---
title: Kibi CI SWI-Prolog provisioning
status: active
tags:
  - strict-modeling
  - lane:strict
  - fact:subject
text_ref: .github/workflows/swipl-ci-bundle.yml
fact_kind: subject
subject_key: kibi.prolog.bundled_ci
id: FACT-prolog-bundled-ci-subject
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

How Kibi's own continuous integration provisions SWI-Prolog: CI jobs run the verified bundled runtime, one job keeps a system SWI-Prolog, and a release never trusts an archive from the CI cache. It concerns Kibi's CI, not end-user installs.
