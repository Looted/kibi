---
title: The artifact verifier refuses a corrupted or mis-provenanced SWI-Prolog archive before running its payload
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T20:30:00.000Z'
id: SCEN-NEG-prolog-artifact-provenance-CORRUPT-ARCHIVE
type: scenario
---
Given a built SWI-Prolog platform archive whose archive or binary checksum, target, version, source, dependency or patch pin, source commit or workflow run no longer matches its manifest and sidecar, when the artifact verifier checks it, then it refuses the archive before executing any payload binary.

This is the failure side of artifact provenance verification. scripts/tests/swipl-build-pipeline.test.ts "refuses %s corruption before payload execution" exercises each mutation, and "refuses unsafe or incomplete inventory: %s" covers unsafe and incomplete archive entries.
