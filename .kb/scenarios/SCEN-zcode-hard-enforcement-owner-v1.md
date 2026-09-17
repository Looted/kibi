---
title: Kibi git hooks remain the hard enforcement gate
status: active
tags:
  - scenario
  - zcode
  - enforcement
id: SCEN-zcode-hard-enforcement-owner-v1
type: scenario
---
A repository runs kibi init and receives its Kibi git hooks.

The canonical init installs those hooks, and the installed pre-commit hook continues to block non-compliant commits, proving the hard enforcement gate remains owned by Kibi git hooks rather than by the kibi-zcode adapter.