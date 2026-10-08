---
title: Engine daemon package version tests
status: active
priority: must
tags:
  - engine
  - daemon
  - prolog
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-engine-daemon-package-versions
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-08T21:05:50.427Z'
id: TEST-engine-daemon-package-versions
type: test
---
Runs the engine daemon identity suite against a real daemon: a request with other package versions is refused for every method but handshake and stop, the handshake reports the daemon's versions, and a daemon started with other versions is replaced by a client with the built versions.