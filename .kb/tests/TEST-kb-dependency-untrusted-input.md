---
title: A KB dependency's git values and checkout cannot run code
status: passing
priority: must
tags:
  - e2e
  - integration
  - unit
verification_scope: end_to_end
origin:
  kind: agent
  ref: 'Maintainer request, 2026-11-12, after the review of release 2026.11.2 reported the findings: "Well, can you make a PR with a hotfix then?" and "Yes, do all post review work in the hotfix."'
  recorded_at: '2026-11-12T14:31:01.259Z'
id: TEST-kb-dependency-untrusted-input
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-kb-dependency-untrusted-input-verifier
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-85f0c1a76f8b7ba620ebf83a
    test_id: TEST-kb-dependency-untrusted-input
    scope: end_to_end
    outcome: passed
    code_snapshot: b9a8a3d62f83e6f89fa3b9e015b701a8f0712935a62b51cea931eb7234a2233b
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-12T14:33:51.227Z'
    finished_at: '2026-11-12T14:33:54.943Z'
    artifact_digest: 762d80ab15f68f2cfeab5139d9b74ab00215da2e3ae70606531f1e00927cbe4d
    contract_hash: a3f8a50e34cd0e056fcb15e20398092c7c5f206375689f4606176ba79276290e
    binding_hash: 909acbe21b243c40b8a73cf6e15d22cf3cc852559af1a271d8b0d08144186330
    fingerprint: 346eb5bd9e0944bc600688c61dae4977f20d33b84e31ba15249580ccd8ab5430
    fingerprint_components:
      contract: a3f8a50e34cd0e056fcb15e20398092c7c5f206375689f4606176ba79276290e
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
      - symbol_id: SYM-kb-dependency-untrusted-input-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
verification_perspective: consumer
---
`packages/cli/tests/dependencies/kb-dependencies.test.ts` asserts that a `git` or `ref` value starting with `-` or holding a control character is refused with DEPENDENCIES_INVALID when the manifest or the lock is read, that `ls-remote` and `fetch` receive the URL after `--end-of-options`, and that the fetch environment disables the `ext` transport. `packages/cli/tests/plugins/project-config.test.ts` asserts that with KIBI_KB_DEPENDENCY set the checkout's `package.json#kibi` plugins are not read, and `packages/cli/tests/env/bootstrap.test.ts` that its `.env.kibi` and `.env` are not loaded while the user env file is. It would pass falsely if the fixtures named no plugin or env key, so each case first asserts the value is read without the variable.

Integration: the `git argument safety` cases run the real `git` binary against repositories created in a temporary directory, with an injected `--upload-pack=touch <marker>` value, and assert the marker file was never created.

End to end: `packages/cli/tests/dependencies/kb-dependency-untrusted-consumer.test.ts` runs the built `kibi` binary in a fresh repository against a dependency repository that tries to run code. `kibi deps lock` and a `--kb` read refuse an injected `--upload-pack=touch <marker>` url or ref with DEPENDENCIES_INVALID and the marker file is never created; a `--kb` read of a dependency whose commit carries a plugin under `node_modules`, a `package.json#kibi.plugins` entry and a `.env.kibi` with a `NODE_OPTIONS` preload succeeds without the marker being written. Both cases fail on the 2026.11.2 build.
