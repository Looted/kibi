---
id: TEST-kibi-distribution-parity-matrix
title: Source, packed, dogfood, and pinned distribution parity tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - parity
  - distribution
  - dogfood
  - packed
  - cli
  - mcp
  - e2e
links:
  - type: validates
    target: SCEN-kibi-distribution-parity-matrix
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-packed-distribution-parity
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4b4eb71cd8a6a520ee688eca
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 73da24f732c9810d0581386ba05c3bb1e9e6949b97cc677c8be893778677dbee
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Exercises `kibi.distribution-parity.v1` through source and freshly packed CLI/MCP binaries, then optionally through the binaries actually resolved by audited projects. The fixture set checks proposition ingestion, source-bound contradiction witnesses, conservative proof stages, dependency-ordered repair plans, snapshot-bound receipt gaps, and telemetry acceptance. Align is expected to resolve this checkout and match; BizzWords' older pinned CLI/MCP capabilities must be reported as unsupported rather than silently passing, with a named upgrade action for each divergence.
