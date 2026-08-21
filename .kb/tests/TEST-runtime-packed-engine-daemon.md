---
title: Packed runtime engine daemon consumer proof
status: open
tags:
  - runtime
  - engine
  - packed
  - e2e
  - proof
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-runtime-packed-engine-daemon
  required_case_symbols:
    - SYM-test-runtime-engine-daemon
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
id: TEST-runtime-packed-engine-daemon
type: test
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d206a131961caa103c19e6c9
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: failed
    code_snapshot: 158983a0942918e5ed9ab66fe8b224a5d9b0f89b9b3faeec0237c2a0c3fbe123
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T11:59:37.879Z'
    finished_at: '2026-08-21T12:03:33.503Z'
    artifact_digest: 72766520808cfec2dc79a8b28bbb32a90f129ca41f8dcb423d6023fb1702b0ed
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: failed
        retries: 0
        duration_ms: 235624
  - version: kibi.verification-receipt.v2
    receipt_id: VR-bc84694a030d284470f9d57a
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 2db6d1a67158f48da12c689696dfd98cd0ad6a3a812390f90ed274bc200654f9
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T12:05:05.302Z'
    finished_at: '2026-08-21T12:08:54.829Z'
    artifact_digest: 882920e273567a5276903b5728009160aab17c815f8c1bce7001b2174cdac7a0
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 229527
  - version: kibi.verification-receipt.v2
    receipt_id: VR-d6e62b13ff791173d3f54428
    test_id: TEST-runtime-packed-engine-daemon
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-runtime-packed-engine-daemon
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 7f4bec418801b52aae7f24a4a1d47309688066afdb15efe420c256b24c210bd2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-21T12:24:40.578Z'
    finished_at: '2026-08-21T12:29:16.021Z'
    artifact_digest: 65ba909175cbebb4330758ae57f7fd526dae395e9078263b963d98ef568b93cf
    contract_hash: f55723ff2baef6d83352cd00e187c51a79823a7db8bcd85e961d8fef91c0a0d1
    case_results:
      - symbol_id: SYM-test-runtime-engine-daemon
        project: default
        outcome: passed
        retries: 0
        duration_ms: 275443
---
