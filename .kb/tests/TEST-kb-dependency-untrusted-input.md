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
---
`packages/cli/tests/dependencies/kb-dependencies.test.ts` asserts that a `git` or `ref` value starting with `-` or holding a control character is refused with DEPENDENCIES_INVALID when the manifest or the lock is read, that `ls-remote` and `fetch` receive the URL after `--end-of-options`, and that the fetch environment disables the `ext` transport. `packages/cli/tests/plugins/project-config.test.ts` asserts that with KIBI_KB_DEPENDENCY set the checkout's `package.json#kibi` plugins are not read, and `packages/cli/tests/env/bootstrap.test.ts` that its `.env.kibi` and `.env` are not loaded while the user env file is. It would pass falsely if the fixtures named no plugin or env key, so each case first asserts the value is read without the variable.

Integration: the `git argument safety` cases run the real `git` binary against repositories created in a temporary directory, with an injected `--upload-pack=touch <marker>` value, and assert the marker file was never created.
