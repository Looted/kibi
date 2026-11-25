---
title: 'Signoff and the Kibi level: the level is shown, and a level change and each lowered floor are decisions'
status: passing
verification_scope: end_to_end
verification_perspective: internal
tags:
  - levels
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-signoff-level
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-25T13:40:41.657Z'
id: TEST-kibi-signoff-level
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-39c58bcb757a0fd95347bbea
    test_id: TEST-kibi-signoff-level
    scope: end_to_end
    outcome: passed
    code_snapshot: 7f9597c434460a73eb363090fb6f50cda948ddfa4f98dc73161b8efb5ce1a3eb
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T18:18:38.175Z'
    finished_at: '2026-11-25T18:18:39.751Z'
    artifact_digest: 745ac45b21c676db833150e1d1637222236c217c70b2b035a3244e8a1f1cf7d1
    contract_hash: f9d4a0f9e236e2b36acdf8799e46d4a5bfb327049c2117517a4ad143522b4a8d
    binding_hash: 411f99e3a37a479b4e2d41f3276504772a475e5d07963500c21ba4d0061ac66e
    fingerprint: 16cbd5a83dacdbc5608e82dbf4945d24d551cff6b5085a81dd8d1741856afe9d
    fingerprint_components:
      contract: f9d4a0f9e236e2b36acdf8799e46d4a5bfb327049c2117517a4ad143522b4a8d
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
      - symbol_id: SYM-test-kibi-signoff-level
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Automated verification lives in `packages/cli/tests/signoff/collect-mutation.test.ts`, `markdown-render.test.ts` and `html-render.test.ts`. They check that the summary and questions views carry the level and where it is set, that a level change against the base commit and each changed requirement whose floor is lower are listed as decisions while a raise, a retired requirement and an unchanged level are not, that the staged view reads the index and .kb/setup.json without a root package.json, and that the Markdown and HTML views show the level line and a Decisions only you make section.
