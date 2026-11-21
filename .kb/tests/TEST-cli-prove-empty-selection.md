---
title: kibi prove empty selection tests
status: passing
priority: should
tags:
  - proof
  - cli
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-16T13:35:28.375Z'
id: TEST-cli-prove-empty-selection
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-cli-prove-empty-selection
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-bd14cf097213836eb764938c
    test_id: TEST-cli-prove-empty-selection
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 0e1c5bd4728aef95d92ef507b1baebf90b8e4f93abaf65c697750d93e8660037
    binding_hash: b9b0b327ffae6e84bde3889767135a8b4bd6ca81c0ae517656e0ee134c9acbba
    fingerprint: 9a07586075c34c0ce523cae2d7685987439d99ab8514c001209727fb2ec5986d
    fingerprint_components:
      contract: 0e1c5bd4728aef95d92ef507b1baebf90b8e4f93abaf65c697750d93e8660037
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
      - symbol_id: SYM-test-cli-prove-empty-selection
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
The prove command tests (packages/cli/tests/proof/prove-command.test.ts) run proveCommand in a workspace with no integration configuration: with no proof-bearing test it prints the no-proof-bearing-tests summary and exits 0, and with a proof-bearing test it fails with "No proof integration configuration". The prove setup tests (packages/cli/tests/commands/prove-mutation.test.ts) assert that an empty selection is reported even when the configuration cannot be read, and that a selection with a contract test stops with PROOF_INTEGRATIONS_UNAVAILABLE.

A false pass would be a test whose workspace has a configuration file, since then the order of the two checks is never exercised.