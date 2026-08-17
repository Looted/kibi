---
title: Branded requirement health report and badge tests
status: active
tags:
  - cli
  - report
  - badge
  - brand
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
id: TEST-kibi-branded-health-report
type: test
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-branded-health-report
  required_case_symbols:
    - SYM-e2e-packed-cli-html-report
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-65785647780c301be2d65283
    test_id: TEST-kibi-branded-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-branded-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-branded-health-report
    scope: end_to_end
    outcome: failed
    code_snapshot: 12a6db834b968de06289672a27627216c87293e10a58bddf53c50189d71388f8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T18:46:13.414Z'
    finished_at: '2026-08-17T18:46:57.826Z'
    artifact_digest: 7fef76eb894209e082ed8df33e758a37c1c73b06979f27562899a2e4ebf9deba
    contract_hash: 4c47a01ae9011db1d2a38b83cb448f40a3e631aa3066672b187bf455a3cea625
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: failed
        retries: 0
        duration_ms: 44412
  - version: kibi.verification-receipt.v2
    receipt_id: VR-45012e6edfbf0371c38ca19c
    test_id: TEST-kibi-branded-health-report
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-branded-health-report
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-branded-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 12a6db834b968de06289672a27627216c87293e10a58bddf53c50189d71388f8
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T18:48:46.241Z'
    finished_at: '2026-08-17T18:49:29.212Z'
    artifact_digest: f83c866072606eb9753ac26bb06a11dca062cd2558922276057dc7c5946511f3
    contract_hash: 4c47a01ae9011db1d2a38b83cb448f40a3e631aa3066672b187bf455a3cea625
    case_results:
      - symbol_id: SYM-e2e-packed-cli-html-report
        project: default
        outcome: passed
        retries: 0
        duration_ms: 42971
---
Covers canonical inline marks and tokens, exact proof ratio semantics, sequential earliest-blocker gate counts, accessible status text, responsive and print styling, self-contained output, and the generated branded SVG badge.
