---
title: The release decision publishes nothing off master, even with pending changesets
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-05T11:30:00.000Z'
id: SCEN-NEG-kibi-release-master-publish-OFF-MASTER
type: scenario
---
Given pending changesets and unpublished package versions, when the release decision runs on develop or a feature branch, then it returns NOOP with the reason "Not on master" and selects no package to publish.

This is the failure side of master CI publishing: publishing must happen only on master. scripts/tests/release-invariants.test.ts "returns NOOP on non-master branch even with changesets" exercises it.
