---
title: Capability plugin protocol validation tests
status: passing
tags:
  - plugins
  - protocol
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-capability-plugin-protocol-v1
      target: default
  success_policy: all_required_first_attempt
verification_perspective: internal
id: TEST-capability-plugin-protocol-v1
type: test
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 5): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c4c271b243250933e8359d0c
    test_id: TEST-capability-plugin-protocol-v1
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 20c4acc0db77eeeed7930815d81a4bceeede78ff6fc204e8ec32dd7d39854ddb
    binding_hash: 71d850ac84df37c12fd1ad3aa651a8e068ec39ddcfb002ac1bb080c162ef2e64
    fingerprint: 4674f5cdb2dd804f473fc55b5c6b6e858e5ef57971038340f28e2ff84139c15e
    fingerprint_components:
      contract: 20c4acc0db77eeeed7930815d81a4bceeede78ff6fc204e8ec32dd7d39854ddb
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
      - symbol_id: SYM-unit-test-capability-plugin-protocol-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
# TEST-capability-plugin-protocol-v1

Automated coverage: packages/plugin-sdk/tests/sdk.test.ts

## Context
Added when SDK validation and version provenance were hardened, so an invalid plugin or a mismatched version is rejected before use. Source: Commit "make capability seams authoritative and restore parity".
