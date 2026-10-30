---
title: The engine daemon refuses status and query requests from a client with other package versions
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:14:42.973Z'
id: SCEN-NEG-engine-daemon-package-versions-FOREIGN-CLIENT-SERVED
type: scenario
---
Given a running engine daemon, when a client that reports kibi-cli@0.0.1 and kibi-core@0.0.1 completes the handshake and then sends status, kbStatus and query requests, then the daemon answers the handshake with its own package versions and refuses every other request with a package-version mismatch error, while a matching client is still served.

This is the failure side of the daemon version guard: a daemon built from other packages must never answer as if it were the client's own engine. packages/cli/tests/engine-runtime-identity.test.ts "refuses every request but handshake and stop from other package versions" exercises it.
