---
id: REQ-opencode-posture-detection
title: "OpenCode Posture Detection"
status: open
created_at: 2026-05-13T00:00:00Z
source: packages/opencode/src/repo-posture.ts
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - posture
links:
  - type: specified_by
    target: SCEN-opencode-posture-detection
  - type: verified_by
    target: TEST-opencode-smart-enforcement
---

The OpenCode plugin must detect the current workspace posture to adjust enforcement:

1. `root_active`: Kibi is initialized at the repo root with a valid `.kb/config.json`.
2. `root_partial`: Root `.kb/config.json` exists but KB targets are incomplete.
3. `root_uninitialized`: No root `.kb/config.json`, but root declares Kibi intent.
4. `vendored_only`: Kibi is only present in vendored dependencies.
5. `hybrid_root_plus_vendored`: Root `.kb/config.json` exists alongside vendored trees; root is authoritative.
6. Support a `maintenanceDegraded` overlay when runtime execution is unavailable.
