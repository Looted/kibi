---
title: Kibi git hooks remain the hard enforcement gate
status: active
tags:
  - scenario
  - zcode
  - enforcement
id: SCEN-zcode-hard-enforcement-owner-v1
type: scenario
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
A repository runs kibi init and receives its Kibi git hooks.

The canonical init installs those hooks, and the installed pre-commit hook continues to block non-compliant commits, proving the hard enforcement gate remains owned by Kibi git hooks rather than by the kibi-zcode adapter.