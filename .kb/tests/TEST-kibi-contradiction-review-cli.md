---
title: 'Consumer CLI: an Escape claim next to a prose-only cancel requirement compiles to unresolved with that requirement to review, a reported conflict blocks, and bootstrap names it'
status: passing
priority: must
tags:
  - contradictions
  - compile-intent
  - bootstrap
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-contradiction-review-cli
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-kibi-contradiction-review-cli
    target: default
    native_id: packages/cli/tests/consumer/contradiction-review.test.ts::contradiction analysis reports what it could not check::an unmodeled claim next to a prose-only requirement is unresolved with that requirement to review
    source_file: packages/cli/tests/consumer/contradiction-review.test.ts
    line: 117
origin:
  kind: agent
  recorded_at: '2026-10-15T16:04:57.148Z'
id: TEST-kibi-contradiction-review-cli
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-bafe0f8080e7bd0089d01e6a
    test_id: TEST-kibi-contradiction-review-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 8ce1ad0c8052b7fa3ac4cd0577233fd1f647509ffbdfdeb1fa92d0950940b813
    binding_hash: 313a91533b5a1fb70c09a89e2d0117c9c23e60fc717e378ae582506359a25d98
    fingerprint: 2a74f02524bfbfe852f9927e5ec004f38201fbf2f02d8ed27bad2abf2f49229a
    fingerprint_components:
      contract: 8ce1ad0c8052b7fa3ac4cd0577233fd1f647509ffbdfdeb1fa92d0950940b813
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: bdbe13f0b3f8f6c7fcbf15c36b1899e964c5ccdcafe356a7f689a0ebe4d87ff0
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-kibi-contradiction-review-cli
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Drives a fresh workspace through the built `kibi` binary (`packages/cli/tests/consumer/contradiction-review.test.ts`). A drawing editor has a closed, prose-only requirement saying Escape cancels a label edit without saving. Compiling "Escape saves the label" must give `unresolved` with `unmodeled_target` and that requirement in `reviewCandidates`; a `conflict` review blocks the plan; a `no_conflict` review keeps the outcome unresolved while the claim is unmodeled. A modeled claim next to a prose-only requirement stays `ready` but `unresolved` until reviewed, a modeled consistent pair is `no_conflict`, and `kb_plan_bootstrap` names the prose-only requirement for a planned claim and, with a `conflict-review:` diagnostic and a count in the source summary and `recommendedActions`, for a claim it leaves for authoring, but not for an unrelated authoring claim.
