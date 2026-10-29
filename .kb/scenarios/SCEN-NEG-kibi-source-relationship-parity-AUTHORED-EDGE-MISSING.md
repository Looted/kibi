---
title: An authored relationship absent from compiled RDF blocks the source-relationship-parity check
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:15:15.456Z'
id: SCEN-NEG-kibi-source-relationship-parity-AUTHORED-EDGE-MISSING
type: scenario
---
Given a synced KB whose requirement Markdown then gains a specified_by link that has not been compiled, when kibi check runs source-relationship-parity, then it exits with status 1 and reports the specified_by edge as authored_to_compiled drift, and only a sync clears it.

This is the failure side of relationship parity: an authored edge must never be silently missing from what the checks read. documentation/tests/e2e/packed/source-relationship-parity.test.ts "blocks an authored edge that is absent from compiled RDF" exercises it.
