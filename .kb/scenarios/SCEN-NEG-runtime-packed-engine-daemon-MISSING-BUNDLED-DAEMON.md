---
title: An installed runtime without its bundled daemon refuses to start instead of borrowing the kibi-cli daemon
status: active
expects: error
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:05:21.133Z'
id: SCEN-NEG-runtime-packed-engine-daemon-MISSING-BUNDLED-DAEMON
type: scenario
---
Given a packed consumer install in which kibi-runtime's dist/engine-daemon.js has been removed while kibi-cli is still installed, when the runtime's EngineClient starts, then the start fails with an error saying the engine is not built rather than running a daemon from outside kibi-runtime.

This is the failure side of the self-contained daemon guarantee: the runtime engine client resolves its own daemon and never falls back to a nested or sibling kibi-cli. documentation/tests/e2e/packed/runtime-engine-daemon.test.ts "EngineClient from the installed runtime must refuse to start without its bundled daemon instead of borrowing one from kibi-cli" exercises it.
