---
title: The release script refuses a release without a calendar release version
status: active
expects: rejection
tags:
  - negative-path
  - release
origin:
  kind: agent
  recorded_at: '2026-11-04T06:50:00.000Z'
id: SCEN-NEG-kibi-release-version-NO-RELEASE-VERSION
type: scenario
---
Given a release manifest whose release is `2.41.0` or `2026.13.0`, when the release script parses it or computes the next release, then it refuses the manifest instead of assigning a release that is not `YYYY.M.N`; and when kibi-core was not bumped, `kibi-release.ts write` refuses to write a release that kibi-core could not ship.

This is the failure side of the calendar release version. scripts/tests/kibi-release.test.ts "rejects a malformed previous version", "names every bad field" and "refuses a release in which kibi-core cannot ship the manifest" exercise it.