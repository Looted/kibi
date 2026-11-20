---
title: Shared source analysis cache tests
status: passing
priority: must
verification_scope: end_to_end
tags:
  - check
  - symbols
  - performance
origin:
  kind: agent
  recorded_at: '2026-11-17T06:00:00.000Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-check-analysis-cache-shared
      target: default
  success_policy: all_required_first_attempt
id: TEST-check-analysis-cache-shared
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-39a1b69a651d6a313375a77c
    test_id: TEST-check-analysis-cache-shared
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 22920468e46fa833585484a3789c39060ac67eacf5b86f03ee6e6e170ee46c0b
    binding_hash: c0f0a1b8f15c1c9742275bc27528a31c661ba64f4ea866cb0a6b9e349be15d06
    fingerprint: e90efd3cd2649f3db78709e2b8b14a2b7d792a7ca22c53bcfea0abc72936f9bb
    fingerprint_components:
      contract: 22920468e46fa833585484a3789c39060ac67eacf5b86f03ee6e6e170ee46c0b
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
      - symbol_id: SYM-test-check-analysis-cache-shared
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Checks that kibi check opens the branch analysis cache once, hands it to the granularity and symbol debt steps and saves it once after both, and that a step called with an open cache neither opens nor saves another.