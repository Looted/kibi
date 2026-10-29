---
title: A platform package whose version drifts from the fixed release group is refused before publishing
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:01:53.679Z'
id: SCEN-NEG-020-VERSION-DRIFT
type: scenario
---
Given the publishable package manifests, when one platform package carries a version that differs from the fixed release group version, then publish metadata verification refuses the set and reports the drifting package.

This is the failure side of consistent semantic versioning across all npm packages: a release must not ship packages with mismatched versions. scripts/tests/verify-publish-metadata.test.ts "a platform package that drifts from the fixed group version is refused" exercises it.
