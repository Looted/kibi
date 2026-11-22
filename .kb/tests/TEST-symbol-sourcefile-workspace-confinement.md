---
title: Built CLI rejects outside-workspace symbol sourceFile paths
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
    native_id: packages/cli/tests/consumer/symbol-sourcefile-workspace-confinement.test.ts::built CLI rejects outside-workspace symbol sourceFile::preview write refuses absolute and ..-escaping sourceFile paths
    source_file: packages/cli/tests/consumer/symbol-sourcefile-workspace-confinement.test.ts
    line: 36
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b9a2ea6b65c8f1ec84aac92f
    test_id: TEST-symbol-sourcefile-workspace-confinement
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: db6265a911023e2c15768e94e70c6c32c77d57eca5a1d4bf460e871b74519554
    binding_hash: 22436b203084de1d40934ae868ad37d07d77f5e19ba1fa77174e4153268add65
    fingerprint: bae6ee86c5d8b755bfdb177c22dcf936be4f0b1e88f266d4a412ab26e44f7faf
    fingerprint_components:
      contract: db6265a911023e2c15768e94e70c6c32c77d57eca5a1d4bf460e871b74519554
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 0828cfa60f05499124f23f9e495dc6190911688949f53624495ca8918d059e33
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
    kind: e2e
    evidence_level: tested
---
Drives a fresh workspace through the built `kibi` binary (`packages/cli/tests/consumer/symbol-sourcefile-workspace-confinement.test.ts`). It asks the public write surface to accept a symbol whose `sourceFile` is absolute or uses a `..` escape, and asserts the payload is refused with a workspace-relative path error so coordinate refresh cannot probe outside the repository.

Unit regressions remain in `packages/cli/tests/utils/repo-relative-path.test.ts`, `packages/cli/tests/operations/mutation-validation.test.ts`, `packages/cli/tests/operations/symbol-refresh.test.ts`, `packages/mcp/tests/tools/symbols.test.ts`, and `packages/mcp/tests/workspace-path.test.ts`.
