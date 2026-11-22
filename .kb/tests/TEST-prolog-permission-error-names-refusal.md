---
title: Prolog permission error message tests
status: passing
priority: must
tags:
  - prolog
  - errors
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-16T09:59:31.061Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-prolog-permission-error-names-refusal
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-permission-error-names-refusal
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1f285f8479bc7d156066542c
    test_id: TEST-prolog-permission-error-names-refusal
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 7d37ac17aac0364120d09247cbef71e9df9afb537f1f5e8aa36badca4ce5cb4a
    binding_hash: 79852ca15ff76f9d598194a540d632571db4586df6286eb6b701d532718015c6
    fingerprint: 70789e4b72b9ae62bd8f83fcc7d970ff6fca7435ea9e1fd3a22082a6c78499b6
    fingerprint_components:
      contract: 7d37ac17aac0364120d09247cbef71e9df9afb537f1f5e8aa36badca4ce5cb4a
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
      - symbol_id: SYM-test-prolog-permission-error-names-refusal
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Asks a live Prolog session to load a second copy of discovery.pl and checks the error the caller gets names the refused redefinition and its context (packages/cli/tests/prolog/permission-error-message.e2e.test.ts), and parses permission_error terms of every shape (packages/cli/tests/prolog/error-terms-parse.test.ts, packages/cli/tests/prolog/error-terms.test.ts): store, audit and stale-snapshot terms keep their messages, a term with a plain operation and resource kind names them, adds a plain-atom culprit and the context message on one line cut to 240 characters, and a term whose parts are not plain atoms keeps "Access denied or KB locked".

A false pass would be a test that checks only one term shape, so a culprit carrying a path or a context that is not a quoted message would slip into the message unchecked.