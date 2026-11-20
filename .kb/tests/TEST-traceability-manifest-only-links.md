---
title: Staged extraction ignores implements comments and keeps manifest links
status: passing
priority: must
tags:
  - traceability
  - staged-check
  - e2e
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-11, to hard-drop inline implements comments; wording approved: "Ok"'
  recorded_at: '2026-11-11T05:47:30.413Z'
id: TEST-traceability-manifest-only-links
type: test
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-staged-gate-rejects-comment-only-link
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-69facb79863395697afda94c
    test_id: TEST-traceability-manifest-only-links
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 8fc26b31209e62cd2b2ddc875f4c936d43f7845c02c5ce7c06a154c203a72db1
    binding_hash: 9b8c1fe9abc52e38b99c59e15dd9d0781c61f39f0d26f338645569bd4f81239e
    fingerprint: d69597e2831240e3f8addc570b3b659bc1e862511f02c614c634d0f527fe343f
    fingerprint_components:
      contract: 8fc26b31209e62cd2b2ddc875f4c936d43f7845c02c5ce7c06a154c203a72db1
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
      - symbol_id: SYM-e2e-staged-gate-rejects-comment-only-link
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
The packed consumer test `documentation/tests/e2e/packed/inline-implements-comments.test.ts` installs the packed CLI, stages a requirement and a function whose only link is an `implements` comment naming it, and asserts that `kibi check --staged` exits 1, names the function with 0 of 1 links and says a code comment is never a link.

Unit coverage: `packages/cli/tests/traceability/traceability.test.ts` runs `extractSymbolsFromStagedFile` on staged TypeScript: a function under an implements comment with no manifest lookup must have empty `reqLinks`, and a function whose manifest lookup entry implements REQ-MANIFEST must keep exactly that link although its comment names REQ-INLINE. It would pass falsely if the fixture comment were not directly above the declaration, so both fixtures put it on the preceding line.
