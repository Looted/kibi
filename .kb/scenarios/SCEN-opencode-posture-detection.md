---
id: SCEN-opencode-posture-detection
title: OpenCode Posture State Detection
type: scenario
status: active
created_at: 2026-05-13T00:00:00Z
source: documentation/scenarios/SCEN-opencode-posture-detection.md
priority: must
tags:
  - enforcement
  - opencode
  - posture
links:
  - type: verified_by
    target: TEST-opencode-smart-enforcement
---

## Scenario: Posture State Detection

The OpenCode Kibi Plugin must adjust its guidance based on the repository's Kibi state (posture).

### Posture State Detection
**Given** an OpenCode session is starting
**When** the plugin checks the repository state
**Then** it must correctly classify the posture as:
- `root_active` if `.kb/config.json` is at the repo root.
- `root_partial` if root `.kb/config.json` exists but configured KB targets are missing.
- `root_uninitialized` if no root `.kb/config.json` exists but the root declares Kibi intent.
- `vendored_only` if only vendored Kibi markers are present under nested/vendor paths.
- `hybrid_root_plus_vendored` if a root `.kb/config.json` coexists with vendored Kibi markers.
- `maintenance_degraded` as an overlay when maintenance execution is unavailable or disabled.
