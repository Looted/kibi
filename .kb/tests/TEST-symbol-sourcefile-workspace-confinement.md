---
title: 'Regression: coordinate refresh and upsert reject outside-workspace sourceFile'
status: passing
tags:
  - security
  - symbols
  - coordinates
  - e2e
verification_scope: end_to_end
id: TEST-symbol-sourcefile-workspace-confinement
type: test
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-symbol-sourcefile-workspace-confinement
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-symbol-sourcefile-workspace-confinement
    target: default
    native_id: packages/cli/tests/consumer/symbol-sourcefile-workspace-confinement.test.ts::kibi upsert rejects outside-workspace symbol sourceFile::dry-run refuses absolute and ..-escaping sourceFile with UPSERT_DRY_RUN_INVALID
    source_file: packages/cli/tests/consumer/symbol-sourcefile-workspace-confinement.test.ts
    line: 36
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d6e40eee2e48e279fe0a5747
    test_id: TEST-symbol-sourcefile-workspace-confinement
    scope: end_to_end
    outcome: passed
    code_snapshot: 4577488d18b40eb8157267445bda6ff1aea563e0b25188bd20b3e3bb59975f8c
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-10-19T14:04:53.244Z'
    finished_at: '2026-10-19T14:04:55.844Z'
    artifact_digest: 5388fefc1b9a600450bb5220bc22e6500f2578c856bfae5961eecec52b395c5c
    contract_hash: db6265a911023e2c15768e94e70c6c32c77d57eca5a1d4bf460e871b74519554
    binding_hash: f7017e2a815256b5dfa5d086f06a3712b3b7b52549f9d05d9aa0b0bc20baa728
    fingerprint: 4d2a19c9538ba2d82a3e8ab4b8e4c571cd323601a5e3b23f6fd48ae76b8d85b9
    fingerprint_components:
      contract: db6265a911023e2c15768e94e70c6c32c77d57eca5a1d4bf460e871b74519554
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: a3fe55b81baa98dd63e6ed18d7272c04fc9257c818ce9971a8ba8c6045f7c743
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-symbol-sourcefile-workspace-confinement
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Drives a fresh workspace through the built `kibi` binary (`packages/cli/tests/consumer/symbol-sourcefile-workspace-confinement.test.ts`). It dry-runs `kibi upsert` for a symbol with an absolute `sourceFile` and with a `..` escape, and asserts both return `UPSERT_DRY_RUN_INVALID` naming the workspace-relative path rule.

Unit regressions remain in `packages/cli/tests/utils/repo-relative-path.test.ts`, `packages/cli/tests/operations/mutation-validation.test.ts`, `packages/cli/tests/operations/symbol-refresh.test.ts`, `packages/mcp/tests/tools/symbols.test.ts`, and `packages/mcp/tests/workspace-path.test.ts`.
