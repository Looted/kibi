---
title: An edit that only deletes dead implements comments is not put to the person
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
  recorded_at: '2026-11-12T14:31:02.972Z'
id: TEST-dead-implements-comment-deletion
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-dead-implements-comment-deletion-verifier
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-898efbef6aa5aa3fd8998c00
    test_id: TEST-dead-implements-comment-deletion
    scope: end_to_end
    outcome: passed
    code_snapshot: b9a8a3d62f83e6f89fa3b9e015b701a8f0712935a62b51cea931eb7234a2233b
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-12T14:33:57.148Z'
    finished_at: '2026-11-12T14:33:58.490Z'
    artifact_digest: 43eb4edb842ff105982caa0a8bc8c3ae5197b2b02e75dd4a2de490d1e2028208
    contract_hash: 6d60f2e676813f89540650d2b48215a11aaaa1cfd67fe006670e861b0c82e531
    binding_hash: 956f252332cbe06be0aba8d8de4cd768ce62cb2eb448fc6201d3e466c9589e35
    fingerprint: 4a8a293003a410fa94a3dc2f556e72b76feb39f0a413cf937ff21376583c85f3
    fingerprint_components:
      contract: 6d60f2e676813f89540650d2b48215a11aaaa1cfd67fe006670e861b0c82e531
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
      - symbol_id: SYM-dead-implements-comment-deletion-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
verification_perspective: consumer
---
`packages/agent-core/tests/decision-guard.test.ts` asserts which lines count as a dead implements comment and that an edit, a list of edits and a whole-file write are recognised only when every removed line is such a comment and nothing else changes. `packages/claude/tests/hook-runner.test.ts` asserts that the Claude hook does not ask for a comment-only deletion in a file a firm requirement governs and still asks when the same edit also changes code. It would pass falsely if the file were not governed by a firm requirement, so the second case uses the same file.

Integration: the Claude case drives the real hook runner with PreToolUse events against a temporary workspace that holds a KB and the source file, so the decision guard, the manifest lookup and the hook output are exercised together.

End to end: `packages/claude/tests/dead-implements-comment-consumer.test.ts` runs the shipped `bin/hook-runner.mjs` bundle under node with a PreToolUse event, as Claude Code does, in a workspace whose file a firm requirement governs. A comment-only deletion returns no permission decision and the same edit with a code change returns `ask`. The first assertion fails on the 2026.11.2 bundle.
