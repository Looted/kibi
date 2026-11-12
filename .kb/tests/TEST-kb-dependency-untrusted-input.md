---
title: A KB dependency's git values and checkout cannot run code
status: passing
priority: must
tags:
  - integration
  - unit
verification_scope: integration
origin:
  kind: agent
  ref: 'Maintainer request, 2026-11-12, after the review of release 2026.11.2 reported the findings: "Well, can you make a PR with a hotfix then?" and "Yes, do all post review work in the hotfix."'
  recorded_at: '2026-11-12T14:23:38.313Z'
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
    receipt_id: PR-612b038753741e1a67e9e4e5
    test_id: TEST-kb-dependency-untrusted-input
    scope: integration
    outcome: passed
    code_snapshot: 0b03c3c442249e2aa7d6f864db987f1dae2198cb8d7afa0d509bc738029dde2f
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-12T14:24:28.459Z'
    finished_at: '2026-11-12T14:24:30.686Z'
    artifact_digest: ad0e4a8e5f27116c195830274f4158bbe647cd8b87e527f4f9b07047a9effa3c
    contract_hash: a3f8a50e34cd0e056fcb15e20398092c7c5f206375689f4606176ba79276290e
    binding_hash: 4f9fe6909a49113d644292ea5e927f46e3af9cd0c5429f92dc672f2c33fffb38
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
---
`packages/cli/tests/dependencies/kb-dependencies.test.ts` asserts that a `git` or `ref` value starting with `-` or holding a control character is refused with DEPENDENCIES_INVALID when the manifest or the lock is read, that `ls-remote` and `fetch` receive the URL after `--end-of-options`, and that the fetch environment disables the `ext` transport. `packages/cli/tests/plugins/project-config.test.ts` asserts that with KIBI_KB_DEPENDENCY set the checkout's `package.json#kibi` plugins are not read, and `packages/cli/tests/env/bootstrap.test.ts` that its `.env.kibi` and `.env` are not loaded while the user env file is. It would pass falsely if the fixtures named no plugin or env key, so each case first asserts the value is read without the variable.

Integration: the `git argument safety` cases run the real `git` binary against repositories created in a temporary directory, with an injected `--upload-pack=touch <marker>` value, and assert the marker file was never created.
