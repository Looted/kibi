---
title: Release packaging refuses a tampered SWI-Prolog archive before extracting anything
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:06:24.393Z'
id: SCEN-NEG-prolog-bundled-release-TAMPERED-ARCHIVE
type: scenario
---
Given a pipeline archive with one byte appended after its SHA-256 sidecar was written, when release packaging populates the platform package from it, then population fails with a SHA-256 mismatch, the extractor is never called and no payload is written to the package.

This is the failure side of verified release packaging: a platform package must never ship a runtime from an archive that fails its checksum. scripts/tests/populate-swipl-platform-packages.test.ts "refuses a tampered archive before extracting anything" exercises it.
