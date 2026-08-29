---
title: Packed CLI doctor workflow diagnostics
status: active
tags:
  - cli
  - doctor
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-cli-doctor-workflows
  required_case_symbols:
    - SYM-e2e-packed-cli-doctor
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
id: TEST-cli-doctor-workflows
type: test
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1c4ccfc3044cf5f36025fba1
    test_id: TEST-cli-doctor-workflows
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cli-doctor-workflows
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cli-doctor-workflows
    scope: end_to_end
    outcome: passed
    code_snapshot: 4a51872e077587a549ef89ebad33bf0c2c107ec7b47e19759f11e1748e81677a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T10:23:32.416Z'
    finished_at: '2026-08-29T10:24:16.022Z'
    artifact_digest: 4c8c86555587e3158d67fb14f7c452220d025e74587ffb4b23a88817a8a8256e
    contract_hash: e94a83cf34a93d7a250eb40a62761867770cf0a9087aabdb7871cd11ef89a5c4
    case_results:
      - symbol_id: SYM-e2e-packed-cli-doctor
        project: default
        outcome: passed
        retries: 0
        duration_ms: 43606
  - version: kibi.verification-receipt.v2
    receipt_id: VR-f265b783bb94565de562bcd9
    test_id: TEST-cli-doctor-workflows
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-cli-doctor-workflows
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-cli-doctor-workflows
    scope: end_to_end
    outcome: passed
    code_snapshot: a1e8acca6edb3d4c59ea790f4840a75a26e642ecbbda1fffd13b67ec89f60df2
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-29T10:28:53.475Z'
    finished_at: '2026-08-29T10:29:38.266Z'
    artifact_digest: 27cdcd3067bf2182c5f71614395fd8800f27ffbd349c7ebae3ce9b9ff5369fa8
    contract_hash: e94a83cf34a93d7a250eb40a62761867770cf0a9087aabdb7871cd11ef89a5c4
    case_results:
      - symbol_id: SYM-e2e-packed-cli-doctor
        project: default
        outcome: passed
        retries: 0
        duration_ms: 44791
---
