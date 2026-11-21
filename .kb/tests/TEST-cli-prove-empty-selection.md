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
    receipt_id: PR-73ba7aec973d4194c302ab55
    test_id: TEST-cli-prove-empty-selection
    scope: end_to_end
    outcome: passed
    code_snapshot: 7419ad5232bdbe1da8fca26f74b4b9ead24f00ba6d0d7de0f96f555646c2e065
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T21:09:11.644Z'
    finished_at: '2026-11-20T21:19:43.232Z'
    artifact_digest: 7139602fb04835015fd589e7172c5d2d08aef422be8d030f6da4a15ac11ca687
    contract_hash: 0e1c5bd4728aef95d92ef507b1baebf90b8e4f93abaf65c697750d93e8660037
    binding_hash: 128652923f9b98206163c124d7d4917e40207f8a9332ec8a558d50c532e2936c
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