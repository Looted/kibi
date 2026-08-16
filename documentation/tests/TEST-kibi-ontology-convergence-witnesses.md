---
id: TEST-kibi-ontology-convergence-witnesses
title: Packed ontology convergence and contradiction witness tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/tests/TEST-kibi-ontology-convergence-witnesses.md
verification_scope: end_to_end
verification_perspective: consumer
verification_receipts:
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-ONTOLOGY-20260810-01
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/ontology-convergence-witnesses.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: f2a4a4edb0cd96fbe56fe3dbfe87dba7834eff383fb5f103434ff3425509e1ba
    environment_hash: 637756e81846b777cf85b7133d405ff21179312077ee36a2c634adfae3e29c8f
    started_at: '2026-08-10T17:06:26.692Z'
    finished_at: '2026-08-10T17:07:04.810Z'
    artifact_digest: 9fea046443ccc239c2f6f05022356518528f9a0af837b58564a429647e1b09de
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-ONTOLOGY-20260810-02
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/ontology-convergence-witnesses.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: c8dd61fb1d8da0075bb9676a56d19ce167b0e84b60f38be77528138ec67c1cc3
    environment_hash: 5d577f4411c4423b228da7556130dc175e2c00cf1e50e4d9608f6720e9d140f5
    started_at: '2026-08-10T17:42:10.048Z'
    finished_at: '2026-08-10T17:42:38.864Z'
    artifact_digest: 6daad591a29bc2c41c1773f35db9105adc0f442c2cde95fb3246d85e9d45d2da
  - version: kibi.verification-receipt.v2
    receipt_id: VR-9eaa5ec7f58d7e7afe508e4a
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-ontology-convergence-witnesses
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-ontology-convergence-witnesses
    scope: end_to_end
    outcome: passed
    code_snapshot: 44c17edad52435b3de4fe626e5d73cd0cc61e76de39087a76efd653e8cc619d0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:12:39.976Z'
    finished_at: '2026-08-16T19:13:30.168Z'
    artifact_digest: 52aa48631da3e55df0384e1c985c46d1b47c30bba204c9caee052a6939b8e088
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 50192
  - version: kibi.verification-receipt.v2
    receipt_id: VR-5723f74ce53d44c1b2de8a91
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-ontology-convergence-witnesses
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-ontology-convergence-witnesses
    scope: end_to_end
    outcome: passed
    code_snapshot: 44c17edad52435b3de4fe626e5d73cd0cc61e76de39087a76efd653e8cc619d0
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T19:13:31.034Z'
    finished_at: '2026-08-16T19:14:19.351Z'
    artifact_digest: 5a0c62753f0ec7f9992e404b6e3b92a522eb8acbf39652e45a5a77427857fcef
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 48317
  - version: kibi.verification-receipt.v2
    receipt_id: VR-99e2b35f387b7e44682c718a
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-ontology-convergence-witnesses
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-ontology-convergence-witnesses
    scope: end_to_end
    outcome: passed
    code_snapshot: a69433014b5f9eb89a2da3131f8923c6db518d979c14f564130f31f6b7135625
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:23:03.467Z'
    finished_at: '2026-08-16T21:23:44.358Z'
    artifact_digest: 97f7c372b93af3fd82dad587b923e1c7df54cd0063780c161ded423f970d8cf2
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 40891
  - version: kibi.verification-receipt.v2
    receipt_id: VR-919e55a66d34e94900558143
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: node scripts/run-proof-contract.mjs --test-id TEST-kibi-ontology-convergence-witnesses
    command_argv:
      - node
      - scripts/run-proof-contract.mjs
      - '--test-id'
      - TEST-kibi-ontology-convergence-witnesses
    scope: end_to_end
    outcome: passed
    code_snapshot: 8b71ffc197df80c9e37218952deac03bb23ad67a801bc972abf7ff56d7eed1cf
    environment_hash: c36b8dbbf50f5f1dc835eff08feca6412c4cc52c2d5dc33d08066a4f77bd1d92
    started_at: '2026-08-16T21:48:41.459Z'
    finished_at: '2026-08-16T21:49:23.646Z'
    artifact_digest: 4a90b9b5ff5ce8817f5d5014bbd51fcab8daa54154a0e9becdf4ae557ac51d41
    contract_hash: 8d613b550ceb1c1a07871a02082b3c852b93cda190bdf5e126f1aa3e79e84299
    case_results:
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
        project: default
        outcome: passed
        retries: 0
        duration_ms: 42187
tags:
  - requirements
  - ontology
  - predicates
  - contradictions
  - witnesses
  - packed
  - e2e
links:
  - type: validates
    target: SCEN-kibi-ontology-convergence-witnesses
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-ontology-convergence-witnesses
  required_case_symbols:
    - SYM-test-packed-ontology-convergence-witnesses
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
---

Exercises project-local schema discovery, exact schema and polarity selection, binding-plan withholding, and source-bound contradiction evidence through a packed CLI consumer installation. Core PLUnit coverage separately proves strict, predicate, contradictory-rule, and unresolved-rule witness semantics.
