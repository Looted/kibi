---
id: TEST-git-hook-effective-install
title: Effective Git hooks path resolver, installer results, and init context regressions
status: passing
source: .kb/tests/TEST-git-hook-effective-install.md
links:
  - type: validates
    target: SCEN-git-hook-effective-install
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-git-hook-effective-install-init-context-verifier
      target: default
    - symbol_id: SYM-git-hook-effective-install-installer-verifier
      target: default
    - symbol_id: SYM-git-hook-effective-install-doctor-verifier
      target: default
    - symbol_id: SYM-git-hook-effective-install-repository-context-verifier
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9fc6fe179f3b386ac240beef
    test_id: TEST-git-hook-effective-install
    scope: end_to_end
    outcome: passed
    code_snapshot: dd89a3bd639f852bd566dfe6dbca6955400b5fa5850b88fa37d22d33fe2da749
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T08:59:45.967Z'
    finished_at: '2026-09-26T08:59:53.215Z'
    artifact_digest: caca28c8fa678f536493868ae230124741e6d7ea321938548c9ce1d911462f85
    contract_hash: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
    binding_hash: 6aed0b8a7d1a08fab07b63b9166b795cc16c20dce209cd305e6f232b068edf8e
    fingerprint: 489f196e14b2ca691b14b656d9212c65ec900389d049e0a73d2793f631ca90a8
    fingerprint_components:
      contract: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
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
      - symbol_id: SYM-git-hook-effective-install-init-context-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-installer-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-doctor-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-repository-context-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1858de6a482e567582b9e68a
    test_id: TEST-git-hook-effective-install
    scope: end_to_end
    outcome: passed
    code_snapshot: 45d848237d557a6e290df2f21725892d4a805ab3c66e339e91d3f63063bc431d
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T09:14:08.702Z'
    finished_at: '2026-09-26T09:14:15.062Z'
    artifact_digest: 9e4a815d4124863bbb04ec1c8b0f7253b077d6e30e02ee28dd2751c1aafcb740
    contract_hash: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
    binding_hash: 6aed0b8a7d1a08fab07b63b9166b795cc16c20dce209cd305e6f232b068edf8e
    fingerprint: 489f196e14b2ca691b14b656d9212c65ec900389d049e0a73d2793f631ca90a8
    fingerprint_components:
      contract: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
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
      - symbol_id: SYM-git-hook-effective-install-init-context-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-installer-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-doctor-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-repository-context-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e8d6778360a361c4db36e0fc
    test_id: TEST-git-hook-effective-install
    scope: end_to_end
    outcome: failed
    code_snapshot: 45d848237d557a6e290df2f21725892d4a805ab3c66e339e91d3f63063bc431d
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T09:16:48.105Z'
    finished_at: '2026-09-26T09:49:08.338Z'
    artifact_digest: 29d16748072a8b5bc21e7e3989b85a2f74045caa17d5cefd0f28a01bd7c20475
    contract_hash: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
    binding_hash: 6aed0b8a7d1a08fab07b63b9166b795cc16c20dce209cd305e6f232b068edf8e
    fingerprint: 489f196e14b2ca691b14b656d9212c65ec900389d049e0a73d2793f631ca90a8
    fingerprint_components:
      contract: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
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
      - symbol_id: SYM-git-hook-effective-install-init-context-verifier
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-installer-verifier
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-doctor-verifier
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-repository-context-verifier
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-git-hook-effective-install-init-context-verifier
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +109 more'
      - symbol_id: SYM-git-hook-effective-install-installer-verifier
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +109 more'
      - symbol_id: SYM-git-hook-effective-install-doctor-verifier
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +109 more'
      - symbol_id: SYM-git-hook-effective-install-repository-context-verifier
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +109 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-a0a6d3ae889763e4b4baae7e
    test_id: TEST-git-hook-effective-install
    scope: end_to_end
    outcome: passed
    code_snapshot: 9dbe4fb057da0e02fad37fd3dbd7aae5e3393101253e24902bad17c197028265
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T12:23:22.746Z'
    finished_at: '2026-09-26T12:51:34.877Z'
    artifact_digest: 0a7403d1c8dd53721eb26b4662e3a3dce6f8718b2d08b6af1084b986cf357e5c
    contract_hash: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
    binding_hash: 6aed0b8a7d1a08fab07b63b9166b795cc16c20dce209cd305e6f232b068edf8e
    fingerprint: 489f196e14b2ca691b14b656d9212c65ec900389d049e0a73d2793f631ca90a8
    fingerprint_components:
      contract: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
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
      - symbol_id: SYM-git-hook-effective-install-init-context-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-installer-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-doctor-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-repository-context-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-25b64bf370d8647d6cf94107
    test_id: TEST-git-hook-effective-install
    scope: end_to_end
    outcome: passed
    code_snapshot: 34b09de93a08198af13c639cab8a56bde1bcfd2eb685a6b6da9cfa3321f9517e
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-28T19:00:25.576Z'
    finished_at: '2026-09-28T19:00:45.941Z'
    artifact_digest: a89e79b5dd73c146586bffc0fd454e1b6a0a2f9640d2aa5b9bcbb3e9f25fc698
    contract_hash: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
    binding_hash: 1728e166cc941a5993ad4375af43264962ac65b644bc10eb2e8123e569176c8b
    fingerprint: 489f196e14b2ca691b14b656d9212c65ec900389d049e0a73d2793f631ca90a8
    fingerprint_components:
      contract: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
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
      - symbol_id: SYM-git-hook-effective-install-init-context-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-installer-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-doctor-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-repository-context-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-338f8b896078ac0dac1aac6e
    test_id: TEST-git-hook-effective-install
    scope: end_to_end
    outcome: passed
    code_snapshot: 46d7e9c65bf1b20d2ddaee8ac683e32df90fa588f3e8d777e370a570b2d620a4
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-28T20:17:21.496Z'
    finished_at: '2026-09-28T20:17:39.984Z'
    artifact_digest: 18e3c0cccf82ee876a5d1e62da42d2973c809ded973f834b8fbec0bd31696ec8
    contract_hash: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
    binding_hash: 1728e166cc941a5993ad4375af43264962ac65b644bc10eb2e8123e569176c8b
    fingerprint: 489f196e14b2ca691b14b656d9212c65ec900389d049e0a73d2793f631ca90a8
    fingerprint_components:
      contract: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
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
      - symbol_id: SYM-git-hook-effective-install-init-context-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-installer-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-doctor-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-repository-context-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-0e84d5eced68056b700e76cd
    test_id: TEST-git-hook-effective-install
    scope: end_to_end
    outcome: passed
    code_snapshot: 929a2bffbc0505e38bf19d595788f7d828560a5dcbc0657e4f5b5e9cbbc6d807
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-30T09:34:29.510Z'
    finished_at: '2026-09-30T09:53:47.264Z'
    artifact_digest: bf1056b84a11011e16a37703ce5da52de1172c40ecacc8002976e09efa49291d
    contract_hash: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
    binding_hash: 8ec303a762f2cfe063c6ec64aaf7b773318344921786406a63d9e7770abb3d0e
    fingerprint: 489f196e14b2ca691b14b656d9212c65ec900389d049e0a73d2793f631ca90a8
    fingerprint_components:
      contract: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
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
      - symbol_id: SYM-git-hook-effective-install-init-context-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-installer-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-doctor-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-repository-context-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-b01514c006d62eb40a5e4d44
    test_id: TEST-git-hook-effective-install
    scope: end_to_end
    outcome: passed
    code_snapshot: 9d8c969a1036b5252bf5402afb67f30d32751cc3899cb5fcbb9ac8bcf1f314c9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-30T15:24:18.113Z'
    finished_at: '2026-09-30T15:24:22.446Z'
    artifact_digest: f9333457c121392c24edf7962ac544710814548d059cb43b6c399fc46e2d007b
    contract_hash: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
    binding_hash: 0992f22be31995fd4067287e956aef47c460e3aad9ce596cb3497581a5017b9d
    fingerprint: 489f196e14b2ca691b14b656d9212c65ec900389d049e0a73d2793f631ca90a8
    fingerprint_components:
      contract: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
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
      - symbol_id: SYM-git-hook-effective-install-init-context-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-installer-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-doctor-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-repository-context-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-2dc02c978760200e898cb366
    test_id: TEST-git-hook-effective-install
    scope: end_to_end
    outcome: failed
    code_snapshot: 8fb074352a17be05561541067c14da2d9e6e89e777386919772553e67b77500b
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:11:59.335Z'
    finished_at: '2026-10-01T09:38:24.320Z'
    artifact_digest: a675541cbee50c14cb84530ccb77adec70545b1e68ab237e85e2431e83d99ad8
    contract_hash: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
    binding_hash: 0992f22be31995fd4067287e956aef47c460e3aad9ce596cb3497581a5017b9d
    fingerprint: 489f196e14b2ca691b14b656d9212c65ec900389d049e0a73d2793f631ca90a8
    fingerprint_components:
      contract: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
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
      - symbol_id: SYM-git-hook-effective-install-init-context-verifier
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-installer-verifier
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-doctor-verifier
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-repository-context-verifier
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-git-hook-effective-install-init-context-verifier
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
      - symbol_id: SYM-git-hook-effective-install-installer-verifier
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
      - symbol_id: SYM-git-hook-effective-install-doctor-verifier
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
      - symbol_id: SYM-git-hook-effective-install-repository-context-verifier
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-38a17e294f9e0ef4590eb0fd
    test_id: TEST-git-hook-effective-install
    scope: end_to_end
    outcome: passed
    code_snapshot: b0a0bf2dc3bd1d4cf56aa9042728bfe8b43f10e7e26ae224cf684951c5473113
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:51:24.198Z'
    finished_at: '2026-10-01T10:20:28.398Z'
    artifact_digest: 67c88df13fd1cb31df3ae51c70db3030b178296242c3bae5b349197ffadcb1d3
    contract_hash: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
    binding_hash: 0992f22be31995fd4067287e956aef47c460e3aad9ce596cb3497581a5017b9d
    fingerprint: 489f196e14b2ca691b14b656d9212c65ec900389d049e0a73d2793f631ca90a8
    fingerprint_components:
      contract: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
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
      - symbol_id: SYM-git-hook-effective-install-init-context-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-installer-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-doctor-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-repository-context-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-630223aba30477ec8d3f261f
    test_id: TEST-git-hook-effective-install
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c80dd7ef127c802baaac4d13480e36f0354458dbf12278f4c05ecd963af3a8
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T11:36:24.203Z'
    finished_at: '2026-10-01T12:02:27.097Z'
    artifact_digest: 3237662bfbe570c6aeb81885227c29d37b6585082c209f53d5c35a5c36ece74d
    contract_hash: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
    binding_hash: 0992f22be31995fd4067287e956aef47c460e3aad9ce596cb3497581a5017b9d
    fingerprint: 489f196e14b2ca691b14b656d9212c65ec900389d049e0a73d2793f631ca90a8
    fingerprint_components:
      contract: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
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
      - symbol_id: SYM-git-hook-effective-install-init-context-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-installer-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-doctor-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-repository-context-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Real-git regression coverage for effective hooks path handling:

- `packages/cli/tests/utils/git-repository-context.test.ts` — resolver unit
  cases with isolated fixture git config: normal repository, subdirectory,
  linked worktree (common hooks dir + validated primary root), bare
  repository reported unsupported, worktree of a bare repository (primary
  null), configured `core.hooksPath` with origin, config change visibility,
  and spaces in paths.
- `packages/cli/tests/commands/init-git-context.test.ts` — init inside a
  linked worktree (hooks in the common dir, worktree-local `.kb`), init from
  a subdirectory (no nested `.kb/`), root/subdirectory agreement for blocked
  branch attachments (unfinished journal, corrupted journal, legacy store,
  legacy+hashed conflict, identity-manifest mismatch), foreign-hook skip
  reporting with per-hook integration recipes, configured `core.hooksPath`
  installation, outside-repository hooksPath refusal, coverage-limitation
  messaging for relative hooks paths in worktrees, and bare-repository
  refusal.
- `packages/cli/tests/commands/install-hook-safety.test.ts` — symlinked hook
  files are never edited through their target (external plain hook, external
  kibi-managed block, dangling symlink, directory symlink); regular managed
  hooks stay idempotently updatable.
- `packages/cli/tests/commands/doctor-git-context.test.ts` — doctor verdicts
  agree from root/subdirectory/linked worktree, a `core.hooksPath` change is
  visible on the next in-process invocation, and configuration stays visible
  in missing-hook diagnostics.
- `packages/cli/tests/commands/init-coverage.test.ts` — updated installer
  success message assertions.

These tests spawn real `git` and the built CLI; they run in the CLI package
suite.
