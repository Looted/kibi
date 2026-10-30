---
title: Symbolic links in a platform payload are replaced by regular files before packing
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:05:18.558Z'
id: SCEN-CASE-prolog-bundled-release-symlinked-payload
type: scenario
---
Given a SWI-Prolog payload whose libz and libswipl sonames are four symbolic links to the real library files, when release packaging materializes the payload, then no symbolic link remains, every name the loader uses is a regular file with the original bytes, and names nothing loads are dropped; a link that escapes the payload or dangles is refused.

The test case scripts/tests/populate-swipl-platform-packages.test.ts "leaves no symbolic link and keeps every loader-visible name as a regular file" exercises it. It covers the value past the bound of symbolic links in platform payloads, `gt 0`.