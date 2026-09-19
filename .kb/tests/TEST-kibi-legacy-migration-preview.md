---
id: TEST-kibi-legacy-migration-preview
title: Legacy migration preview vertical-slice tests
status: passing
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
source: documentation/tests/TEST-kibi-legacy-migration-preview.md
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - requirements
  - migration
  - semantics
  - source-binding
  - packed
  - e2e
links:
  - type: validates
    target: SCEN-kibi-legacy-migration-preview
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-legacy-migration-plan
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4852b99cb79671b74a7e8fe8
    test_id: TEST-kibi-legacy-migration-preview
    scope: end_to_end
    outcome: passed
    code_snapshot: 108fe624639c2c7c00ac5f051d948270f8c18926753c35581e701c3ae1bfc1aa
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T10:04:24.719Z'
    finished_at: '2026-09-18T10:37:16.478Z'
    artifact_digest: b15a7bc4b29c307248e8600846fa2a23b322db1a4047fbb1600a7cbceae82595
    contract_hash: 993fc6935132c1081cfc2abd2922eaf2362f2c8aa462fffb1c76103e885bbf05
    binding_hash: 2194f9b255b50c48c986ab7294c1a34424d2c9e586779cd8bc18b48e234855c1
    fingerprint: 035e0409cb2784c820820ead4e24e0c83773c36a8311814934c47d6ab7590da2
    fingerprint_components:
      contract: 993fc6935132c1081cfc2abd2922eaf2362f2c8aa462fffb1c76103e885bbf05
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
      - symbol_id: SYM-legacy-migration-plan-build
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-92c2f0fa3b2344a8aa38e16d
    test_id: TEST-kibi-legacy-migration-preview
    scope: end_to_end
    outcome: passed
    code_snapshot: 7dce1afe0fdd43aa1d0e4feea031d222163ed053450d755795c7e5b9b1b332b5
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T11:08:18.939Z'
    finished_at: '2026-09-18T11:31:55.494Z'
    artifact_digest: 1305c15266e3c7a81377bac6480bd3ebd0eb54580efdb96dd5a10302f76039f2
    contract_hash: 993fc6935132c1081cfc2abd2922eaf2362f2c8aa462fffb1c76103e885bbf05
    binding_hash: 2194f9b255b50c48c986ab7294c1a34424d2c9e586779cd8bc18b48e234855c1
    fingerprint: 035e0409cb2784c820820ead4e24e0c83773c36a8311814934c47d6ab7590da2
    fingerprint_components:
      contract: 993fc6935132c1081cfc2abd2922eaf2362f2c8aa462fffb1c76103e885bbf05
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
      - symbol_id: SYM-legacy-migration-plan-build
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-05868efac1ff4e24720ed280
    test_id: TEST-kibi-legacy-migration-preview
    scope: end_to_end
    outcome: passed
    code_snapshot: 8465c8db1c316b64cda7e0e5e8183795129f74cfda3fa1592a16e0e62df2d15b
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T12:54:02.548Z'
    finished_at: '2026-09-18T13:26:16.375Z'
    artifact_digest: c856fd3f8a3a374f12bc697a485639499db3fe7263e1bc824f3939e0d3be4d40
    contract_hash: e43e6883dc1d0c5664a2d02112e4fd9ce07d2684f16d7ad49d934b3e69cb77b6
    binding_hash: a7c75806548c4f5f9c7dafa305ae98afe466b1219ee9f31624c283956aa2c71c
    fingerprint: 4fa230ab40e85cd549b170f47eeaeffc86cf4e32e566685a57a2a87370c345a4
    fingerprint_components:
      contract: e43e6883dc1d0c5664a2d02112e4fd9ce07d2684f16d7ad49d934b3e69cb77b6
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
      - symbol_id: SYM-e2e-test-legacy-migration-plan
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-cf71b047bca51c95656a6b84
    test_id: TEST-kibi-legacy-migration-preview
    scope: end_to_end
    outcome: failed
    code_snapshot: 7b99d1487500adc31317021d966877ae85c5f1b35c445e4e2eba81f5817b6ff2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T20:02:42.969Z'
    finished_at: '2026-09-18T20:31:25.898Z'
    artifact_digest: 850d5f8d5f9dd89931eb204bce21ebb0cb3bc1f225cb57b4689c908a940d782c
    contract_hash: e43e6883dc1d0c5664a2d02112e4fd9ce07d2684f16d7ad49d934b3e69cb77b6
    binding_hash: a7c75806548c4f5f9c7dafa305ae98afe466b1219ee9f31624c283956aa2c71c
    fingerprint: 4fa230ab40e85cd549b170f47eeaeffc86cf4e32e566685a57a2a87370c345a4
    fingerprint_components:
      contract: e43e6883dc1d0c5664a2d02112e4fd9ce07d2684f16d7ad49d934b3e69cb77b6
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
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-test-legacy-migration-plan
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-legacy-migration-plan
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +98 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c7e2f784b053c85a3fb7435d
    test_id: TEST-kibi-legacy-migration-preview
    scope: end_to_end
    outcome: passed
    code_snapshot: 39173f6fec98d8bef12deb1e15c088481cd27a0a27f5b8338a332e5e7417dbf7
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T20:41:12.486Z'
    finished_at: '2026-09-18T21:21:14.134Z'
    artifact_digest: 7449bffcd1f42651590f037f344e148e15f13c3305be565a861d03cb0488eb26
    contract_hash: e43e6883dc1d0c5664a2d02112e4fd9ce07d2684f16d7ad49d934b3e69cb77b6
    binding_hash: a7c75806548c4f5f9c7dafa305ae98afe466b1219ee9f31624c283956aa2c71c
    fingerprint: 4fa230ab40e85cd549b170f47eeaeffc86cf4e32e566685a57a2a87370c345a4
    fingerprint_components:
      contract: e43e6883dc1d0c5664a2d02112e4fd9ce07d2684f16d7ad49d934b3e69cb77b6
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
      - symbol_id: SYM-e2e-test-legacy-migration-plan
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---

Exercises `kibi.legacy-migration-plan.v1` through focused CLI and MCP integration tests plus a fresh packed CLI installation, including deterministic pagination, exact source hashes and spans, schema provenance, conflict blocking, and read-only behavior.
