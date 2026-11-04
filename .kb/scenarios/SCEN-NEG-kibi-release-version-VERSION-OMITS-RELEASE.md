---
title: kibi --version does not name a release that does not list the running CLI
status: active
expects: rejection
tags:
  - negative-path
  - release
origin:
  kind: agent
  recorded_at: '2026-11-04T06:50:00.000Z'
id: SCEN-NEG-kibi-release-version-VERSION-OMITS-RELEASE
type: scenario
---
Given an installed kibi-core whose release lists kibi-cli 2.41.0, when kibi-cli 2.40.0 runs `kibi --version`, then it prints the CLI version and points at `kibi doctor` instead of claiming release 2026.11.0; without a manifest it prints `kibi-cli <version>` alone.

This is the failure side of the version line. packages/cli/tests/kibi-release.test.ts "falls back to the CLI version alone" exercises it.