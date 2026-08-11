---
id: TEST-kibi-distribution-parity-matrix
title: Source, packed, dogfood, and pinned distribution parity tests
status: passing
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/tests/TEST-kibi-distribution-parity-matrix.md
verification_scope: end_to_end
verification_perspective: consumer
verification_receipts:
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-PARITY-20260810-01
    test_id: TEST-kibi-distribution-parity-matrix
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/distribution-parity-matrix.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: 967625f2316fe19a8fcffb70cf4586a4da1eb6f0bbaa72861d2c2e2ccabf1639
    environment_hash: 637756e81846b777cf85b7133d405ff21179312077ee36a2c634adfae3e29c8f
    started_at: 2026-08-10T20:21:47.768Z
    finished_at: 2026-08-10T20:23:02.743Z
    artifact_digest: 6305e619b24a6c1b643db11f0de69573cd5815216705927a26bb7486f5209f7d
tags: [parity, distribution, dogfood, packed, cli, mcp, e2e]
links:
  - type: validates
    target: SCEN-kibi-distribution-parity-matrix
---

Exercises `kibi.distribution-parity.v1` through source and freshly packed CLI/MCP binaries, then optionally through the binaries actually resolved by audited projects. The fixture set checks proposition ingestion, source-bound contradiction witnesses, conservative proof stages, dependency-ordered repair plans, snapshot-bound receipt gaps, and telemetry acceptance. Align is expected to resolve this checkout and match; BizzWords' older pinned CLI/MCP capabilities must be reported as unsupported rather than silently passing, with a named upgrade action for each divergence.
