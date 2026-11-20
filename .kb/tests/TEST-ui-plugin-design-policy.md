---
title: kibi-plugin-ui policy tests
status: passing
tags:
  - plugins
  - ui
  - kibi-plugin-ui
priority: must
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-09: UI design plugin'
  recorded_at: '2026-10-09T12:13:46.725Z'
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-ui-plugin-design-policy
      target: default
    - symbol_id: SYM-test-check-policy-rules
      target: default
  success_policy: all_required_first_attempt
id: TEST-ui-plugin-design-policy
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d902dd407d04f0696afa9cc3
    test_id: TEST-ui-plugin-design-policy
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 0922df5acf1929c32f4a2e2421a51e77333007b3689f0f1521b1594e11c2d2ac
    binding_hash: 23f881b60b3bf44e2edb0da5f0bf41a2d9e03be7dc8e9599e2ebde8a6e20307c
    fingerprint: d9cab29cf4ff256b8919ebc445f92ea9d728def75ab55244baf644fe2bb37271
    fingerprint_components:
      contract: 0922df5acf1929c32f4a2e2421a51e77333007b3689f0f1521b1594e11c2d2ac
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
      - symbol_id: SYM-test-ui-plugin-design-policy
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-check-policy-rules
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the kibi-plugin-ui suite, which checks that the packed policy file validates and matches the exported document and that the plugin export carries no permissions, and the check policy rules suite, whose shipped-policy case evaluates React, Angular, props, hook, story, member and store symbols against the real check-policy.json.
