---
id: TEST-opencode-kibi-plugin-v1
title: OpenCode Kibi Plugin v1 Automated Verification
status: passing
created_at: 2026-03-13T00:00:00.000Z
updated_at: 2026-04-20T00:00:00.000Z
priority: must
tags:
  - opencode
  - kibi
  - test
  - enforcement
links:
  - type: validates
    target: SCEN-opencode-kibi-plugin-v1
type: test
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-opencode-plugin
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4f58195d98c58f38645ab2ef
    test_id: TEST-opencode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: fda6ee3d82151dd1cee4719e6d67b7b1ebb8eb7cc3d8f7d84715fb2eb44d56a6
    binding_hash: 14015415f1238fc96688eea8296536c4b045ddcf275efa3f73b869cac0f31549
    fingerprint: 6cb6521f423fa548cc931afe9997c54414b79165051b87c6a8f369f58c41fd2e
    fingerprint_components:
      contract: fda6ee3d82151dd1cee4719e6d67b7b1ebb8eb7cc3d8f7d84715fb2eb44d56a6
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
      - symbol_id: SYM-e2e-opencode-plugin
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
Verify the OpenCode plugin routes initial repository inference through kibi-bootstrap and the exact plan/apply contract, while normal work follows typed status and canonical skills.
