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
    receipt_id: PR-45a8038ec8868513660ecf6e
    test_id: TEST-prolog-permission-error-names-refusal
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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