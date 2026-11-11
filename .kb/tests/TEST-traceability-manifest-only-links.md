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
    receipt_id: PR-942c519d49854da4ed729f41
    test_id: TEST-traceability-manifest-only-links
    scope: end_to_end
    outcome: passed
    code_snapshot: 3d93922b60cecc23bd87c58bfaca0639229212edffea3acd86ec3009e4248bac
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-11T05:57:48.079Z'
    finished_at: '2026-11-11T05:58:56.842Z'
    artifact_digest: f4e05ac4a442931e7ad5bf812e05d4366b89482a541cc6ac2bc15177cc8cd5bd
    contract_hash: 8fc26b31209e62cd2b2ddc875f4c936d43f7845c02c5ce7c06a154c203a72db1
    binding_hash: 24fef43aff1c0116514b8883a8df4208bd32436dc85a9f221fc9241b6e4f2c59
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
