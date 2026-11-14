---
title: SkillOpt reference answers score 100 and the check fails any case below
status: passing
priority: should
tags:
  - skillopt
  - scoring
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-skillopt-reference-verify-suite
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-skillopt-reference-verify-suite
    target: default
    native_id: scripts/skillopt-eval/tests/reference-verify.test.ts::reference answer check::a case's own reference answer scores 100 and one that skips discovery fails
    source_file: scripts/skillopt-eval/tests/reference-verify.test.ts
    line: 40
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for refused .kb reads, reference answers and pooled family gates in SkillOpt scoring: "Approved"'
  recorded_at: '2026-11-13T19:10:00.000Z'
id: TEST-skillopt-reference-answers-score-100
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4b779297a7533d2d44a59a75
    test_id: TEST-skillopt-reference-answers-score-100
    scope: end_to_end
    outcome: passed
    code_snapshot: 6d8b811a6fc4f63413758c1fa458cbf88f9dc764d12dc1198b48d610e0cb6958
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-14T04:51:58.033Z'
    finished_at: '2026-11-14T04:52:16.202Z'
    artifact_digest: ffc069a5cc85b5e21bb898c6728547433ee0f2a3ca32b300330e94aaf772be76
    contract_hash: 96bcbdd9512fc92fa7393a5eb84dbdc6d39a65921bd660fd29ed688186c0791d
    binding_hash: 600da69679bda53568fe300adb1d9c069b0c50a250956719ff55b4741827d1c4
    fingerprint: 7054fa99d5f3d75f4f54bf768620a6865072ef62dc4501a5254526905fdd326c
    fingerprint_components:
      contract: 96bcbdd9512fc92fa7393a5eb84dbdc6d39a65921bd660fd29ed688186c0791d
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 1abafb2337f3a8fbf850a7eb1ebecaddd74d0fdecd24924c4580319166bc2650
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-skillopt-reference-verify-suite
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Stages a kibi-usage case with its evaluator-owned fixture, runs its registered reference answer through `runReference` against the staged Kibi MCP server, and checks with `verifyReferences` in `scripts/skillopt-eval/tests/reference-verify.test.ts` that it scores 100 while an answer that skips discovery fails. The same file checks that a case without a reference fails and that every kibi-usage case has one.