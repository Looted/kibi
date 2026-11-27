---
id: TEST-kibi-intent-aware-source-discovery
title: Intent-aware source discovery verification
type: test
status: passing
created_at: 2026-08-13T00:00:00.000Z
updated_at: 2026-08-13T00:00:00.000Z
priority: must
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - search
  - intent
  - source
  - test
links:
  - type: validates
    target: SCEN-kibi-intent-aware-source-discovery
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-intent-aware-source-discovery
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1f039a27ac67d926adf77da4
    test_id: TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 16477ae8924433dc1d3c64f0854385b0fd5469bed0cd9e2890a99d14cd0e54f5
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T19:58:37.230Z'
    finished_at: '2026-11-25T20:00:01.060Z'
    artifact_digest: 6a8457496221126de13cfb800da839bbf919a72f0603e1b620aa8d8e9ec5cf08
    contract_hash: a98e38ffb7109f0eea389f096cd032ae4ba17e16bc1d20ab2ae949bcedf5fe9a
    binding_hash: f8bf3b515b42acb8d371ce72968a1fbd91d32342016cdc4eba1e3ad8124676cd
    fingerprint: 1d62184e9f85d9cda34f53a049a8413240967cf2f38920b75b23be8c4870d3e1
    fingerprint_components:
      contract: a98e38ffb7109f0eea389f096cd032ae4ba17e16bc1d20ab2ae949bcedf5fe9a
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
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
The CLI and MCP search contracts accept natural-language intent, return stable ranked entities, include source-linked evidence and graph paths, and preserve explicit zero-result behavior. Unit and operation parity tests cover lexical fallback, source filters, relationship filters, and deterministic ordering.
