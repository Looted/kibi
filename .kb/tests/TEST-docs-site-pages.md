---
title: Documentation site renders repository sources and fails on broken links
status: passing
tags:
  - docs
  - site
  - pages
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-docs-site-pages-build
      target: default
  success_policy: all_required_first_attempt
id: TEST-docs-site-pages
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-deba6d2f42805ebbfd37f1c1
    test_id: TEST-docs-site-pages
    scope: end_to_end
    outcome: passed
    code_snapshot: 67d858a55796fd26e00f54db266fe342c994cb23424d111fa8a848defcba43cf
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-29T08:39:27.317Z'
    finished_at: '2026-09-29T08:39:28.237Z'
    artifact_digest: a1e8e954ad13bc176083cfb4ea840b38594cbcb99854ed14059ef43613f7c0e3
    contract_hash: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
    binding_hash: 2f8169d314ea9c5056cf27f4ee29b5ac9dee6ab968ebe1a1d18b2830a4b05700
    fingerprint: 1b2d9390342d5aa3032922ebd9029e138c9573297cdcf75eb6ef8268a7a578dc
    fingerprint_components:
      contract: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
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
      - symbol_id: SYM-docs-site-pages-build
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d93b6fc7b3542c945c0acd1b
    test_id: TEST-docs-site-pages
    scope: end_to_end
    outcome: passed
    code_snapshot: 6519ff36502a44c9d11c42f209520dfed4d22918a8d0d55db45287e44d5cfecb
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-29T08:46:17.204Z'
    finished_at: '2026-09-29T08:46:18.099Z'
    artifact_digest: b27ce8c13d2c8723f300a50bb403ecabbba9b9c76957bb8210d96691b537c85b
    contract_hash: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
    binding_hash: 1c19cb5cb40a7d4e62c1f46355959a070e378a6744feb7330b347130dd64b8e3
    fingerprint: 1b2d9390342d5aa3032922ebd9029e138c9573297cdcf75eb6ef8268a7a578dc
    fingerprint_components:
      contract: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
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
      - symbol_id: SYM-docs-site-pages-build
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-221f12f52aa29d084f1986a5
    test_id: TEST-docs-site-pages
    scope: end_to_end
    outcome: passed
    code_snapshot: a3fe505618ff579980a6f185d54387cd45dcf129ae2597ceaae05cd749e374c4
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T16:59:00.539Z'
    finished_at: '2026-09-29T17:20:23.357Z'
    artifact_digest: 0377648637a4a91448a458efbd8e2b41b4a87db69d5b5bb5b0e96f31624c281b
    contract_hash: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
    binding_hash: 1c19cb5cb40a7d4e62c1f46355959a070e378a6744feb7330b347130dd64b8e3
    fingerprint: 1b2d9390342d5aa3032922ebd9029e138c9573297cdcf75eb6ef8268a7a578dc
    fingerprint_components:
      contract: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
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
      - symbol_id: SYM-docs-site-pages-build
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
