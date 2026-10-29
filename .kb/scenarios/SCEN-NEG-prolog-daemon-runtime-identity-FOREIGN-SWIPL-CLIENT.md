---
title: The engine daemon refuses a request from a client that resolved a different SWI-Prolog
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:54:06.892Z'
id: SCEN-NEG-prolog-daemon-runtime-identity-FOREIGN-SWIPL-CLIENT
type: scenario
---
Given a running engine daemon, when a client sends a status request naming a different resolved SWI-Prolog, or naming none, then the daemon refuses it with a SWI-Prolog mismatch error that names both the client and the server identity.

This is the failure side of runtime identity: a daemon must never answer a client that would load the knowledge base with another Prolog. packages/cli/tests/engine-runtime-identity.test.ts "serves only clients that resolved the daemon's SWI-Prolog" exercises it.
