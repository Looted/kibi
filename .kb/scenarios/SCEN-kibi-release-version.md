---
title: A release names its package set and an install reports its release
status: active
priority: must
tags:
  - release
  - versioning
  - doctor
origin:
  kind: agent
  recorded_at: '2026-11-04T05:50:00.000Z'
id: SCEN-kibi-release-version
type: scenario
---
Given pending changesets, when the maintainer runs `bun run version-packages`, the release gets the next calendar version (`YYYY.M.N`), kibi-core is bumped so it ships the manifest, and `packages/core/release.json` lists every publishable package version with the KB schema, operation protocol and plugin API versions. When a user installs that release, `kibi --version` prints `Kibi <release> (kibi-cli <version>)`, the MCP server title names the release, and `kibi doctor` reports the release under "Kibi release".