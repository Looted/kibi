---
title: Briefing surfaces stay retired across shipped artifacts
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-briefs-retired
      target: default
  success_policy: all_required_first_attempt
id: TEST-e2e-briefs-retired
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7712c9543be8b528c33404d3
    test_id: TEST-e2e-briefs-retired
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: e20cf45e6aacdf3a6709054f6112f73e51c661df0563df45e5532e5ee96abee4
    binding_hash: 89e7e87596033557b59e1e6760352ee9d3c5eba845a65c6e4c11d1d65e5c0efb
    fingerprint: 26462f3b09fd2e7cd1c7772ee6a7913f9a82c2c51c81468eecc96ba1e4a17ae4
    fingerprint_components:
      contract: e20cf45e6aacdf3a6709054f6112f73e51c661df0563df45e5532e5ee96abee4
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
      - symbol_id: SYM-e2e-test-briefs-retired
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

Packed end-to-end regression for briefing surfaces stay retired across shipped artifacts.
