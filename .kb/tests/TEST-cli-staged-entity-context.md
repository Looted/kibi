---
title: 'CLI: the staged check blocks a staged entity without body context and passes base-tree and acknowledged debt'
status: passing
priority: must
tags:
  - cli
  - staged
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-10-16T08:51:37.368Z'
id: TEST-cli-staged-entity-context
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-cli-staged-entity-context
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-cli-staged-entity-context
    target: default
    native_id: packages/cli/tests/consumer/staged-entity-context.test.ts::kibi check --staged entity context::blocks a staged entity without body context and passes debt the commit did not introduce
    source_file: packages/cli/tests/consumer/staged-entity-context.test.ts
    line: 57
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c4931dc514b257493a432aad
    test_id: TEST-cli-staged-entity-context
    scope: end_to_end
    outcome: passed
    code_snapshot: 41881deebf8ec3697db8320dcaa508fecd148666d50247e408a64449f1e9a1ea
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-16T09:02:59.378Z'
    finished_at: '2026-10-16T09:03:05.431Z'
    artifact_digest: 00e0043e3b9e3c77e29848cab511db241ce147b3564cc7385d71c072258c4df1
    contract_hash: 6aeff85f9ecba07fec50edf732bbb50c5280e5d0e1c8ff8675dfdfc09afd0561
    binding_hash: f13992667151b61e4f179e3854c04fcb03d83bda0efd5aea8982c72ee088c614
    fingerprint: 869f63551157ef2eca10402d88d8de7673f3489b7cfce0035401eca711fcaa54
    fingerprint_components:
      contract: 6aeff85f9ecba07fec50edf732bbb50c5280e5d0e1c8ff8675dfdfc09afd0561
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 6c946936026e923386fe210dac9f9de7c07b6f9dee76901e763032eeb0cac2f6
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-cli-staged-entity-context
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Drives a fresh workspace through the built `kibi` binary (`packages/cli/tests/consumer/staged-entity-context.test.ts`). It stages a new test entity without a body and asserts `kibi check --staged` exits 1 with `entity-context-missing` for that entity only, then asserts that the same file with a prose body, an edit to a committed entity that already lacked context, and an entity listed under `contextAcknowledged` in the manifest all pass.
