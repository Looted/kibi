---
title: CLI registration metadata that drifts from the operation catalog, or an unknown operation name, is refused
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T11:00:00.000Z'
id: SCEN-NEG-cli-lazy-operation-loading-METADATA-DRIFT
type: scenario
---
Given the lightweight CLI registration metadata and the authoritative operation catalog, when every metadata entry is compared with its catalog entry by name, CLI name and description, then any differing entry fails the suite, an unknown or empty operation name is not accepted as an operation, and each catalog operation lazily loads exactly its own implementation.

This is the failure side of lazy loading: the metadata the CLI registers at startup cannot drift from the commands it later loads. packages/cli/tests/cli-operation-metadata.test.ts, run as a proof step of the journaled engine harness suite, exercises it.
