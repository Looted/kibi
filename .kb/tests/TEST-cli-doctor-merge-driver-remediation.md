---
title: CLI kibi doctor names only the missing merge driver setup steps
status: passing
priority: must
tags:
  - cli
  - doctor
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-11-05T11:48:06.065Z'
id: TEST-cli-doctor-merge-driver-remediation
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-cli-doctor-merge-driver-remediation-verifier
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-6683b81c9cfc91ea13d1b135
    test_id: TEST-cli-doctor-merge-driver-remediation
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 590e42e2a7d6f8d225609aacd4c0e56510110b623ed13986f9036ad8ea9faf53
    binding_hash: 0804ca92292613241c99b794dcd82ff109a90330a450ffe8b48aac3af5afa11d
    fingerprint: 2c6d5706ca90776ccf38b68d8acf1ef20e8d3f321642eb2fadceda3667346fbd
    fingerprint_components:
      contract: 590e42e2a7d6f8d225609aacd4c0e56510110b623ed13986f9036ad8ea9faf53
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
      - symbol_id: SYM-cli-doctor-merge-driver-remediation-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs `kibi doctor` in a temporary Git workspace with symbol records and a pnpm lockfile: without `merge=kibi` lines the remediation names the lines and the driver command; once `.gitattributes` routes the manifests it names only `git config merge.kibi.driver "pnpm exec kibi merge-driver %O %A %B"`; once the driver is set the check reports Configured. Unit tests pin the remediation text for each combination of gaps.