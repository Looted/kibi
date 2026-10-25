---
title: Capability plugin host resolution tests
status: passing
tags:
  - plugins
  - review:context-missing
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-capability-plugin-host-resolution-v1
      target: default
  success_policy: all_required_first_attempt
verification_perspective: internal
id: TEST-capability-plugin-host-resolution-v1
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3a1329581eecbf9499a0939d
    test_id: TEST-capability-plugin-host-resolution-v1
    scope: unit
    outcome: passed
    code_snapshot: c78d87453534f34be23060678a90114386641b97f24f1f909f008a3c1ad06ae5
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-25T12:27:26.862Z'
    finished_at: '2026-10-25T12:27:27.282Z'
    artifact_digest: 89b783e9a81a9ca76b8ee23d3d7a170a116ca9b53d09c494ec6a4da3239e656e
    contract_hash: 52b30dc8725d33d780bcdffe5a493da60ce9b5ddc58f5a6af46e8b3b8368827e
    binding_hash: 02e64e1f2feeae0d5a93f39edde4af79525f73de7054c94aa7f5dd5396e39fee
    fingerprint: fe7051796b5cc5e57c76d4505892a6fa613295124c3e47e8bb0351acd5b6475d
    fingerprint_components:
      contract: 52b30dc8725d33d780bcdffe5a493da60ce9b5ddc58f5a6af46e8b3b8368827e
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
      - symbol_id: SYM-unit-test-capability-plugin-host-resolution-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
# TEST-capability-plugin-host-resolution-v1

Automated coverage: packages/cli/tests/plugins/capability-plugin-host.test.ts
