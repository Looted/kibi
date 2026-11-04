---
title: Kibi doctor warns about an install that mixes packages from two releases
status: active
expects: rejection
tags:
  - negative-path
  - release
origin:
  kind: agent
  recorded_at: '2026-11-04T05:50:00.000Z'
id: SCEN-NEG-kibi-release-version-MIXED-INSTALL-UNREPORTED
type: scenario
---
Given an install whose kibi-core ships the manifest of release 2026.11.0, when kibi-mcp 3.24.0 is installed although that release lists kibi-mcp 3.25.0, then `kibi doctor` warns under "Kibi release" with a mixed-install message that names kibi-mcp, its installed version and the listed version, instead of reporting the install as release 2026.11.0.

This is the failure side of the release check: packages from different releases must never be reported as one release. packages/cli/tests/kibi-release.test.ts "warns about a mixed install" exercises it.