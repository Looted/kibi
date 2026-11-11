---
title: 'A requirement anchored only to a whole TypeScript file is reviewed, one anchored only to a JSON file is not'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-coarse-anchor-review
type: scenario
---
Given a fixture KB where REQ-COARSE-SOURCE is implemented only by a module-level whole-file anchor on src/feature.ts and REQ-COARSE-CONFIG only by a config-artifact anchor on src/settings.json, when the packed CLI runs kibi check, then coarse_anchor_only_review names REQ-COARSE-SOURCE as a non-blocking finding and not REQ-COARSE-CONFIG.

## Context

The happy path of the coarse anchor review, run by the packed check-review-rules E2E test.
