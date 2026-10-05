---
id: TEST-mcp-cli-help
title: kibi-mcp help exits cleanly in workspace and packed installs
status: active
created_at: 2026-04-17T12:00:00.000Z
updated_at: 2026-04-17T12:00:00.000Z
tags:
  - mcp
  - cli
  - regression
links:
  - type: validates
    target: SCEN-mcp-cli-help
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-mcp-cli-help
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-be56f9f9da375ef0597a3eac
    test_id: TEST-mcp-cli-help
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 34d35c88b20d47c5676f86b8028fbe51a7254960b43bc4e32a6f8767ade5794e
    binding_hash: 9669df046da76fd9c51763f4b7bd30c6b48b1bbf528d48aea7d2b9e91bf3ee77
    fingerprint: e3fea3cc80a52cd2040d69808f02b2123af055c11cbff5a9583f6a2492b137de
    fingerprint_components:
      contract: 34d35c88b20d47c5676f86b8028fbe51a7254960b43bc4e32a6f8767ade5794e
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
      - symbol_id: SYM-e2e-test-mcp-cli-help
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
The test verifies that the `kibi-mcp` binary correctly handles help requests without entering an interactive loop.

**Coverage:**
- Verified in `packages/mcp/tests/cli-help.test.ts` (workspace)
- Verified in `documentation/tests/e2e/packed/mcp-cli-help.test.ts` (packed tarball)
- Verifies that help flags (`--help`, `-h`) result in exit code 0
- Verifies that usage information is output to the console
- Verifies that the process terminates automatically.
