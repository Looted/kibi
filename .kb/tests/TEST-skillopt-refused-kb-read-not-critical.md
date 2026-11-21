---
title: Refused .kb/ file reads are counted apart from completed reads and shell access
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
    - symbol_id: SYM-test-skillopt-refused-kb-read-e2e
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-skillopt-refused-kb-read-e2e
    target: default
    native_id: scripts/skillopt-eval/tests/refused-kb-read-e2e.test.ts::refused .kb/ reads (end to end)::a host-refused .kb/ read costs only the isolation points, and a completed one zeroes the cell
    source_file: scripts/skillopt-eval/tests/refused-kb-read-e2e.test.ts
    line: 68
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for refused .kb reads, reference answers and pooled family gates in SkillOpt scoring: "Approved"'
  recorded_at: '2026-11-13T19:10:00.000Z'
id: TEST-skillopt-refused-kb-read-not-critical
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a6153cf5691d2e446d9a84ac
    test_id: TEST-skillopt-refused-kb-read-not-critical
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: ca77110849a9b9ad066226ec7de4db68f98b90b541236647f93fcaaaed68cfb1
    binding_hash: c484df862d7886a566e51c8532ca6ca6bf93e7cff5467ea420f07a74f159cc0a
    fingerprint: 0cca18003391fbd5744c1ddf2e73324dafae580a6b5f284d70bb163c5ba07b8e
    fingerprint_components:
      contract: ca77110849a9b9ad066226ec7de4db68f98b90b541236647f93fcaaaed68cfb1
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: a31c13eb485c742051225e6a8a8a8cf12cbd25282d1a7c2a67e8b1c5a8ed6f2a
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-skillopt-refused-kb-read-e2e
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Feeds a Claude Code host stream through the host's transcript conversion (`claudeStreamToCodexJsonl`), event normalization (`normalizeCodexJsonl`) and the episode score (`deniedReadScore`) in `scripts/skillopt-eval/tests/refused-kb-read-e2e.test.ts`: a Read of a `.kb/` file that the host refused records no violation and the cell scores 85; the same Read returning the file records `direct_kb_access` and the cell scores 0. `scripts/skillopt-eval/tests/codex-events.test.ts` covers the remaining forms: a read with no recorded outcome and a failed shell command naming `.kb/` both record `direct_kb_access`.