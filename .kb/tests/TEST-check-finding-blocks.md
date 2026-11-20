---
title: Finding blocks tag tests
status: passing
priority: must
verification_scope: end_to_end
tags:
  - check
  - staged
origin:
  kind: agent
  recorded_at: '2026-11-16T19:30:00.000Z'
id: TEST-check-finding-blocks
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-check-finding-blocks
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-8cb23a4e5683d2d8a1a14efa
    test_id: TEST-check-finding-blocks
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 438c3eec9848723a9f614dc7bbc13ade5bd04d0a0a68aa4c7d05dc16a90e0d81
    binding_hash: 373b79b5061e9f3fcf6447a85bbfbc85d1d589f25c79b87d2b8b29ef90e444c7
    fingerprint: f1b750345afb0d3bba9755d48f70c494bec5e80752e32d921fd507cd7e7eb173
    fingerprint_components:
      contract: 438c3eec9848723a9f614dc7bbc13ade5bd04d0a0a68aa4c7d05dc16a90e0d81
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
      - symbol_id: SYM-test-check-finding-blocks
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Checks that every finding of the full check carries blocks merge or none, every staged and changed finding carries blocks commit or none, a finding that is blocking or has severity error stops its level, and the envelope's diagnostics leave the tag out.