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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-768446703a78d4521237ec32
    test_id: TEST-symbol-sourcefile-workspace-confinement
    scope: end_to_end
    outcome: passed
    code_snapshot: d1a22132537bfad9f8ef9a933acfa7993c7c3767a5f827fc984524a96c1fd569
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-10-19T14:32:43.449Z'
    finished_at: '2026-10-19T14:32:47.532Z'
    artifact_digest: 1e2aa2e7a4c6739431c0a1cf70ceb50210099a5d6e2d9910fe9da259e97fc1cd
    contract_hash: db6265a911023e2c15768e94e70c6c32c77d57eca5a1d4bf460e871b74519554
    binding_hash: 5038cd9200cedd8d3a6d19c853f9a6292c56936ab08988a7ae4997431db4419e
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
---
Drives a fresh workspace through the built `kibi` binary (`packages/cli/tests/consumer/symbol-sourcefile-workspace-confinement.test.ts`). It asks the public write surface to accept a symbol whose `sourceFile` is absolute or uses a `..` escape, and asserts the payload is refused with a workspace-relative path error so coordinate refresh cannot probe outside the repository.

Unit regressions remain in `packages/cli/tests/utils/repo-relative-path.test.ts`, `packages/cli/tests/operations/mutation-validation.test.ts`, `packages/cli/tests/operations/symbol-refresh.test.ts`, `packages/mcp/tests/tools/symbols.test.ts`, and `packages/mcp/tests/workspace-path.test.ts`.
