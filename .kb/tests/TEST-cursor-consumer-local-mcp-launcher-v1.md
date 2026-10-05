---
title: Cursor Consumer-Local MCP Launcher Verification
status: active
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-6b71daa63fee006a80efed45
    test_id: TEST-cursor-consumer-local-mcp-launcher-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 12dc34ad9776336dedbf33b21d194747d2d2e268da31dbaed2286addf45a2ffe
    binding_hash: fc71ede30cce460b55e850e515776a0737422c829631ba125abb906318ba7047
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
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---