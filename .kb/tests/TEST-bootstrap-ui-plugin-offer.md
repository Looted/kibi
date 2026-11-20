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
    receipt_id: PR-441644f587cd63a19d9ac898
    test_id: TEST-bootstrap-ui-plugin-offer
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
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
