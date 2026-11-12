---
title: A KB dependency's git values and checkout cannot run code
status: passing
priority: must
tags:
  - integration
  - unit
verification_scope: end_to_end
origin:
  kind: agent
  ref: Post-release review of Kibi 2026.11.2, 2026-11-12
  recorded_at: '2026-11-12T14:09:25.253Z'
id: TEST-kb-dependency-untrusted-input
type: test
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kb-dependency-untrusted-input
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ee01326ad0145c7f9b984768
    test_id: TEST-kb-dependency-untrusted-input
    scope: end_to_end
    outcome: passed
    code_snapshot: 12577d72464a9debc90aa9f72badf680997386a94cd2b4027dd9bb4122919390
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-12T15:12:23.150Z'
    finished_at: '2026-11-12T15:12:25.374Z'
    artifact_digest: 734947dac00eae959328c7f46dd6c09a27ff613267067b6f4b20e91f75589fd4
    contract_hash: 88523f26b22ef1ecd09fb991be2a6810805dc4b2c4dde1ee7cf64329dc4ad15c
    binding_hash: 742096c9001bb8f1a51595e1d3c8bc8ceb827e76ac4818a0828d03ee1c188e16
    fingerprint: 21058eff509ffbfa94a67b2bea937e07e809646ea1e85094193864312399d4b3
    fingerprint_components:
      contract: 88523f26b22ef1ecd09fb991be2a6810805dc4b2c4dde1ee7cf64329dc4ad15c
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
      - symbol_id: SYM-test-kb-dependency-untrusted-input
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
`packages/cli/tests/dependencies/kb-dependencies.test.ts` asserts that a `git` or `ref` value starting with `-` or holding a control character is refused with DEPENDENCIES_INVALID when the manifest or the lock is read, that `ls-remote` and `fetch` receive the URL after `--end-of-options`, and that the fetch environment disables the `ext` transport. `packages/cli/tests/plugins/project-config.test.ts` asserts that with KIBI_KB_DEPENDENCY set the checkout's `package.json#kibi` plugins are not read, and `packages/cli/tests/env/bootstrap.test.ts` that its `.env.kibi` and `.env` are not loaded while the user env file is. It would pass falsely if the fixtures named no plugin or env key, so each case first asserts the value is read without the variable.

Integration: the `git argument safety` cases run the real `git` binary against repositories created in a temporary directory, with an injected `--upload-pack=touch <marker>` value, and assert the marker file was never created.
