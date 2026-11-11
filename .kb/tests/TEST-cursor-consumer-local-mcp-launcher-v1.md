---
title: Cursor Consumer-Local MCP Launcher Verification
status: passing
tags:
  - test
  - cursor
  - plugin
  - mcp
  - consumer-local
  - launcher
  - verification
priority: must
id: TEST-cursor-consumer-local-mcp-launcher-v1
type: test
text_ref: documentation/tests/e2e/packed/cursor-plugin-launcher.test.ts
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-cursor-packed-launcher-e2e
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b09415b242bcf99ac998161f
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: b5b00f0bbba161dbde7a16c1f93e6cd570fa04666bb0d922a3ce3c35e0227a47
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T04:18:20.564Z'
    finished_at: '2026-11-10T04:18:21.297Z'
    artifact_digest: b1fbdc92e310135115f9584faf6c52fff3ac93cfcd8a415cbf55330e51030a83
    contract_hash: 12dc34ad9776336dedbf33b21d194747d2d2e268da31dbaed2286addf45a2ffe
    binding_hash: 197c447068e2deb1ee13e075a659f5dc39a911a6a49eab93c39a64a62f683202
    fingerprint: dd695185f8c2f67d64202c487a46bf6013ccdf3e3725b4a3993485cbc018cef6
    fingerprint_components:
      contract: 12dc34ad9776336dedbf33b21d194747d2d2e268da31dbaed2286addf45a2ffe
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
      - symbol_id: SYM-cursor-packed-launcher-e2e
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 5): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---

## Context
This covers isolated and packed launches, workspace selection, package layouts, exit codes and signal forwarding.
