---
title: CLI protocol accepts capabilityPlugins on advisor envelopes
status: passing
tags:
  - cli
  - protocol
  - capability-plugins
verification_scope: unit
verification_perspective: internal
id: TEST-cli-protocol-capability-plugins
type: test
---
# TEST-cli-protocol-capability-plugins

Executable coverage: `packages/cli/tests/cli-protocol.test.ts` and `packages/cli/tests/public/contracts-remaining.coverage.test.ts`.

Asserts operation output contracts accept optional `capabilityPlugins` on semantic-advisor and compile-intent envelopes without PROTOCOL_VALIDATION_FAILED.
