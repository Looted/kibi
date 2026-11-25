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
    receipt_id: PR-b42152f11b1fc568aafe33bc
    test_id: TEST-kibi-signoff-level
    scope: end_to_end
    outcome: passed
    code_snapshot: 5e75456c7e6a64b13eb01deb7301a46a32b1f334b573fc0e870b5a9563b8721e
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T14:17:03.106Z'
    finished_at: '2026-11-25T14:17:04.745Z'
    artifact_digest: ae03a152d32b13f6b8c6cb02d3dd5258676b06be71e63a108e7d88b22ade33ba
    contract_hash: f9d4a0f9e236e2b36acdf8799e46d4a5bfb327049c2117517a4ad143522b4a8d
    binding_hash: e8b98990fb9142ec6bf020f5fab134da456f3df2d2fb5ffb6a86e64fa52afc65
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
