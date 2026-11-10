---
title: Release CI publishes from a branch other than master
status: active
tags:
  - negative-path
fact_kind: property_value
subject_key: kibi.release.versioning
property_key: master_ci_publishes
operator: eq
value_type: bool
value_bool: false
origin:
  kind: agent
  recorded_at: '2026-11-05T11:30:00.000Z'
id: FACT-NEG-kibi-release-master-publish-OFF-MASTER
type: fact
---
Release CI runs on develop or a feature branch with pending changesets and decides to publish packages from there.
