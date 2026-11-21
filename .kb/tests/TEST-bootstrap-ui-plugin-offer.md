---
title: Bootstrap plugin offer tests
status: passing
tags:
  - bootstrap
  - plugins
  - ui
priority: must
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-09: UI design plugin'
  recorded_at: '2026-10-09T12:14:06.521Z'
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-bootstrap-ui-plugin-offer
      target: default
    - symbol_id: SYM-test-check-policy-sdk
      target: default
  success_policy: all_required_first_attempt
id: TEST-bootstrap-ui-plugin-offer
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-302293860cd9d2411eb16d8e
    test_id: TEST-bootstrap-ui-plugin-offer
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 123ac7914ced0d3353be47477834baf25e872c68b47b2b343df16908f290c3dd
    binding_hash: e5931d5da646365d03bb69383af18f0f4a1a5346d0770dcf8a5d53b77aa5b7a3
    fingerprint: 24c052619ea273a6a5f3ff1277b39c1f51782492e26a9144566a309a9a2df527
    fingerprint_components:
      contract: 123ac7914ced0d3353be47477834baf25e872c68b47b2b343df16908f290c3dd
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
      - symbol_id: SYM-test-bootstrap-ui-plugin-offer
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-check-policy-sdk
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the bootstrap plugin offers suite, which plans temporary workspaces with and without production components, with stories only, and with the plugin declined or activated, and checks the plugin_offer recommended action; and the plugin SDK check policy suite, whose declinedPlugins cases accept bare names and reject paths and non-strings.
