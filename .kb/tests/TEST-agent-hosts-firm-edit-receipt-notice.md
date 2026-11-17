---
title: Host firm-edit receipt notice tests
status: passing
priority: should
tags:
  - hooks
  - codex
  - cursor
  - zcode
  - firmness
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-16T07:01:53.789Z'
id: TEST-agent-hosts-firm-edit-receipt-notice
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-agent-hosts-firm-edit-receipt-notice
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-222d3c3d08d90d91579aa742
    test_id: TEST-agent-hosts-firm-edit-receipt-notice
    scope: end_to_end
    outcome: passed
    code_snapshot: 32ee33b73de52a5faea88037234ee6420cfcba340ad0940b4021a05c62fa772d
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T15:59:57.320Z'
    finished_at: '2026-11-17T16:01:23.687Z'
    artifact_digest: d09cbb9e24a5c64ebb7906817e2158cc3bf9a4fb1cfc3c06803829d500e573bf
    contract_hash: 2f115ac7b5e77bc1b5569d42c92b4ee607aca6025ae0f3178139e06077da85b5
    binding_hash: 285d711a2083cad091bac33735e30c6c4d11dcff07bb940aa3433ac3ff75e202
    fingerprint: 95869d0a2e0f6ae4b35a44ec9b9a2035a10e61a2b9b58cb40917b89117bc9185
    fingerprint_components:
      contract: 2f115ac7b5e77bc1b5569d42c92b4ee607aca6025ae0f3178139e06077da85b5
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
      - symbol_id: SYM-test-agent-hosts-firm-edit-receipt-notice
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the Codex, Cursor and ZCode hook runners on a pre-edit event for code that implements a firm requirement and checks that the notice tells the agent to ask the person before breaking the rule and to record its verdict with kibi review-firm-edit, once per requirement per session, and that a keeps receipt committed in an earlier session does not stop the notice in a new session (packages/codex/tests/hook-runner.test.ts, packages/cursor/tests/hook-runner.test.ts, packages/zcode/tests/hook-runner.test.ts). The decision guard tests check the notice text, and the receipt tests check that a receipt counts only when it was recorded after the session asked (packages/agent-core/tests/decision-guard.test.ts, packages/agent-core/tests/firm-edit-review.test.ts).

A false pass would be a host test that writes a receipt for different code than it edits, so the notice shows for the wrong reason.