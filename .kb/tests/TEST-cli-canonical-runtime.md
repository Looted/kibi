---
title: CLI unit tests prove canonical discovery, authoring, and ignore policy
status: passing
tags:
  - cli
  - canonical-layout
verification_scope: end_to_end
verification_perspective: internal
text_ref: packages/cli/tests/commands/sync/discovery.test.ts
id: TEST-cli-canonical-runtime
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-cli-canonical-runtime
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-9b9efb6ae70183d98ebf67de
    test_id: TEST-cli-canonical-runtime
    scope: end_to_end
    outcome: passed
    code_snapshot: a5446868a446994c5f4fd11b2b79aafd2fc5de7074f0157e5fb77d57a0c7c69d
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:10:31.299Z'
    finished_at: '2026-10-28T10:11:48.940Z'
    artifact_digest: ce70735c5969044b60ef8699bbf041dfb125a7eb830a2ea3829bc975f6fa8a7d
    contract_hash: 88ddd690acca6efceac12d08d82e4c8589f065c8a61eb17b7d9f0696d26cf76b
    binding_hash: c15cadd3e18a2595de77adaad85e3927816969299c79373be4fd5a4333dd64fa
    fingerprint: 51541cdb6a7e1e399b46ffdb5659122646e97bdf602fd25f7f49c9552123db91
    fingerprint_components:
      contract: 88ddd690acca6efceac12d08d82e4c8589f065c8a61eb17b7d9f0696d26cf76b
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
      - symbol_id: SYM-e2e-test-cli-canonical-runtime
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
Unit coverage lives in `packages/cli/tests/commands/sync/discovery.test.ts`, `packages/cli/tests/operations/source-authoring.test.ts`, `packages/cli/tests/public/ignore-policy.test.ts`, and `packages/cli/tests/traceability/git-staged.test.ts`.
