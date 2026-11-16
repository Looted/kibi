---
title: A requirement anchored only to a whole TypeScript file is reviewed, one anchored only to a JSON file or a flat ESLint config is not
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-15T22:01:26.302Z'
id: SCEN-kibi-coarse-anchor-review-v2
type: scenario
---
Given a fixture KB where REQ-COARSE-SOURCE is implemented only by a module-level whole-file anchor on src/feature.ts, REQ-COARSE-CONFIG only by a config-artifact anchor on src/settings.json and REQ-COARSE-LINT only by a config-artifact anchor on a flat eslint.config.js that exports a config array, when the packed CLI runs kibi check, then coarse_anchor_only_review names REQ-COARSE-SOURCE as a non-blocking finding and neither REQ-COARSE-CONFIG nor REQ-COARSE-LINT.

## Context

The happy path of the coarse anchor review, run by the packed check-review-rules E2E test. The flat ESLint config is a file a JavaScript extractor reads but that declares no behavioral symbol.
