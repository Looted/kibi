---
id: TEST-cli-prolog-codec
title: CLI Prolog codec round-trip and parsing tests
status: passing
created_at: 2026-08-04T00:00:00Z
updated_at: 2026-08-04T00:00:00Z
source: packages/cli/tests/prolog/codec.test.ts
tags: [cli, prolog, codec, unit]
verification_scope: unit
verification_perspective: internal
links:
  - type: validates
    target: SCEN-001
---

Verifies atom and string escaping, entity/property decoding, typed Prolog values, nested list and tuple parsing, violation-row decoding, and lossless preservation of repeated relationship properties.
