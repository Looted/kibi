---
title: Release automation must use Changesets for versioning and publishing
status: active
tags:
  - strict-lane
fact_kind: subject
subject_key: kibi.release.versioning
canonical_key: req.req_020
id: FACT-SUBJ-REQ-020
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

How Kibi's npm packages get their versions and are published: version bumps and changelogs through Changesets on develop, and master CI building and publishing only the bumped package versions. It is release mechanics, not the calendar release numbering.
