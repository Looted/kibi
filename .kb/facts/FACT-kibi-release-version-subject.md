---
title: Kibi release version
status: active
fact_kind: subject
subject_key: kibi.release.version
canonical_key: kibi.release.version
tags:
  - strict-modeling
  - lane:strict
  - fact:subject
  - release
text_ref: scripts/kibi-release.ts
origin:
  kind: agent
  recorded_at: '2026-11-04T05:40:00.000Z'
id: FACT-kibi-release-version-subject
type: fact
---

The calendar version that names one Kibi release (YYYY.M.N) together with the manifest listing the version of each package in it. It is distinct from each package's own semver, which kibi --version prints beside it.
