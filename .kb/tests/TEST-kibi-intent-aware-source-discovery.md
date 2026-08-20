---
id: TEST-kibi-intent-aware-source-discovery
title: Intent-aware source discovery verification
type: test
status: passing
created_at: 2026-08-13T00:00:00.000Z
updated_at: 2026-08-13T00:00:00.000Z
source: documentation/tests/TEST-kibi-intent-aware-source-discovery.md
priority: must
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - search
  - intent
  - source
  - test
links:
  - type: validates
    target: SCEN-kibi-intent-aware-source-discovery
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-intent-aware-source-discovery
  required_case_symbols:
    - SYM-test-kibi-intent-aware-source-discovery
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1590a04fbb5bbe3cc92dcf93
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 6a464a0ab9424eeae745abc2017b449edacbf34916dfb995881fa2bb0bde6931
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:45:47.828Z'
    finished_at: '2026-08-16T19:46:32.936Z'
    artifact_digest: 031dac062f8a0c55e19142a07579dc00037c4f8c03c4910bd77fcfffe7deb7e6
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 45108
  - version: kibi.verification-receipt.v2
    receipt_id: VR-968f9483dbf75b8c3219ca7b
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T22:08:20.253Z'
    finished_at: '2026-08-16T22:09:15.957Z'
    artifact_digest: 031012c2b539c15c2d44259c0d6949a3b1e6eaff8c456fd4ced285c49733a279
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 55704
  - version: kibi.verification-receipt.v2
    receipt_id: VR-7f48d5e3888993a72d9cfad4
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b936ce6f2ba0c88a57db980ec2e18c2ca652e74cc92e928daa53b28860e4bd
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T12:28:14.467Z'
    finished_at: '2026-08-17T12:28:57.798Z'
    artifact_digest: a81d92ee1472d1785b68acc5c12bc8e9959ffb2e64c2c60f66ea96267ee2fe6d
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 43331
  - version: kibi.verification-receipt.v2
    receipt_id: VR-cc44fa07c3c3553cd83603cf
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 36bab0ed975a391ff64ebbae677a18044c9719b29227cad4a6a4264c9e738105
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-17T21:21:00.282Z'
    finished_at: '2026-08-17T21:21:46.046Z'
    artifact_digest: a3884c68eb1b1212aaaeb381e3ff83202e67527183f8f87cdbf3b7e083820796
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 45764
  - version: kibi.verification-receipt.v2
    receipt_id: VR-1ef1721b5452d6c7da45f36e
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c1f3210effae8b1ca451b023d2f770a2c220a42de2ed217d150c32680c0a28
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T07:36:42.536Z'
    finished_at: '2026-08-18T07:37:31.540Z'
    artifact_digest: c0ada6e6bf7bbc1cdb7b1803be4740fd31f1932ebc46e45a499df1697e195709
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 49004
  - version: kibi.verification-receipt.v2
    receipt_id: VR-8a7a4c3f52eaeba2072ac160
    test_id: TEST-kibi-intent-aware-source-discovery
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-intent-aware-source-discovery
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-intent-aware-source-discovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fcd0eb00007cab8568d1fe7480b9cafcc53bbd136e68885532e4ceedfe5ad6a
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-18T11:02:54.100Z'
    finished_at: '2026-08-18T11:03:42.223Z'
    artifact_digest: b7782c4639cffd03d17178af86ac607812ef8f9aabde4d1addd4c778d7eea297
    contract_hash: 9ff77301c476e0962c5534b44d4bbbb046053837c3e6551db603fad8d291d21f
    case_results:
      - symbol_id: SYM-test-kibi-intent-aware-source-discovery
        project: default
        outcome: passed
        retries: 0
        duration_ms: 48123
---

The CLI and MCP search contracts accept natural-language intent, return stable ranked entities, include source-linked evidence and graph paths, and preserve explicit zero-result behavior. Unit and operation parity tests cover lexical fallback, source filters, relationship filters, and deterministic ordering.
