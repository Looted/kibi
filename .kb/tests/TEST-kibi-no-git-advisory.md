---
title: No-Git advisory tests
status: active
priority: must
tags:
  - vcs
  - branching
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:19:37.079Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-no-git-advisory
      target: default
  success_policy: all_required_first_attempt
id: TEST-kibi-no-git-advisory
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c48e1b214dbc253fea6707f9
    test_id: TEST-kibi-no-git-advisory
    scope: end_to_end
    outcome: passed
    code_snapshot: 0a45d046587c86ae2fe6ad3485e642b643695698e24ca64a81f5a0911bfdafab
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-26T19:15:58.890Z'
    finished_at: '2026-11-26T19:16:15.402Z'
    artifact_digest: ea1be7270b9312f87db1e46e732d1112c55c5e57dc16fcfc9361311211f48ca4
    contract_hash: 05a376bb858664a39805ff1c075047743ca8bae1ee65a9188891a22443943c39
    binding_hash: 817168eb6449cb7fa0e7e75c20a83806f8cf41330715760cd534e93903c1eccf
    fingerprint: 68d68dcc20b40be11c3bdde2953a4c9e28ff0cc40b7fe1f068ecfb542888771c
    fingerprint_components:
      contract: 05a376bb858664a39805ff1c075047743ca8bae1ee65a9188891a22443943c39
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
      - symbol_id: SYM-test-kibi-no-git-advisory
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Checks the advisory diagnostic and which operations always carry it (packages/cli/tests/vcs/advisory.test.ts), the advisory text for a missing repository, missing Git and KIBI_BRANCH (packages/agent-core/tests/version-control.test.ts), the brief's finish line (packages/agent-core/tests/session-brief.test.ts), the protocol envelope carrying it on status and check only (packages/cli/tests/cli-protocol-mutation.test.ts), doctor's warning and the no-Git agent instructions (packages/cli/tests/doctor-mutation.test.ts) and the built CLI's init, status, check and doctor (packages/cli/tests/consumer/outside-git.test.ts).
