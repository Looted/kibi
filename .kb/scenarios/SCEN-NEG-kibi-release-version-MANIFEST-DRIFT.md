---
title: release:check fails when a package version ships without a matching release manifest
status: active
expects: rejection
tags:
  - negative-path
  - release
origin:
  kind: agent
  recorded_at: '2026-11-04T06:50:00.000Z'
id: SCEN-NEG-kibi-release-version-MANIFEST-DRIFT
type: scenario
---
Given a tree where kibi-cli is 9.9.9 but `packages/core/release.json` lists another version, or where the manifest is missing, when `bun run release:check` runs, then it exits 1 and names each drifted, unlisted or unknown package instead of passing.

This is the failure side of the shipped manifest. scripts/tests/kibi-release.test.ts "reports problems and usage", "reports drifted, unlisted and unknown packages" and "reports a missing or unreadable manifest" exercise it, and the core tarball test requires release.json.