---
title: SWI-Prolog spike configuration accepts pins and rejects invalid inputs
status: passing
tags:
  - prolog
  - spike
  - build
  - validation
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-prolog-spike-config-validation
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-spike-config-validation
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-8016bb2bbca8686d4b71d348
    test_id: TEST-prolog-spike-config-validation
    scope: end_to_end
    outcome: passed
    code_snapshot: 0dc332199edf96dd6d69de7bd02ef17bfe1b28555c8fe63474e7e9db7cdf43b4
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-30T09:22:37.689Z'
    finished_at: '2026-09-30T09:22:38.635Z'
    artifact_digest: 469c8b3e93daea69f8db14710e5ec7fba5d44c0dfa2c876d4f1996f8efee7cc3
    contract_hash: 84e9dae49daa35e44fce96b8d4ebe6ed1da1430fd21244d4f268186f4895f6bb
    binding_hash: ddc85259bddb04d5012546ca21254559d17b10e6a7cb0f3aca121713744cf677
    fingerprint: 7342914246bc550addf138e13746707387ea8f0287ce5bd13df5856b11499a5d
    fingerprint_components:
      contract: 84e9dae49daa35e44fce96b8d4ebe6ed1da1430fd21244d4f268186f4895f6bb
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
      - symbol_id: SYM-test-prolog-spike-config-validation
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Run `bun test ./scripts/tests/swipl-spike-config.test.ts`. The test invokes the public spike wrapper with the pinned manifest for Linux x64 and macOS arm64, checks the reported versions and required libraries, and confirms no native build directory appears. It also rejects malformed manifests and an unsupported target with specific errors.