---
title: Kibi release version tests
status: active
priority: must
tags:
  - release
  - versioning
  - doctor
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-release-version-script
      target: default
    - symbol_id: SYM-test-kibi-release-version-cli
      target: default
    - symbol_id: SYM-test-kibi-release-version-mcp
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-04T05:50:00.000Z'
id: TEST-kibi-release-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-76e1e484b25be9f8d34a56e3
    test_id: TEST-kibi-release-version
    scope: end_to_end
    outcome: passed
    code_snapshot: d06009869b237ff83a86dd090825b8bfd9c2474006b17048dc780a08d42169ac
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-04T05:38:50.429Z'
    finished_at: '2026-11-04T05:38:54.174Z'
    artifact_digest: b5b1b7a9fe047ead05e35063ad0133189acdf82da6f1f635685cf9886ab4a7ce
    contract_hash: 50369c452ed010fe5a9d6f68c1dec67e7e51c1c7980e09c93d381c6cd18ee799
    binding_hash: 6761bc62db9ef084822e48188507287986378d26734fdc1a788697b3e4ad47be
    fingerprint: d5bc8e6c656e608de4740b60cd6a875b840db42327b9d8be12000d0c7e504daa
    fingerprint_components:
      contract: 50369c452ed010fe5a9d6f68c1dec67e7e51c1c7980e09c93d381c6cd18ee799
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
      - symbol_id: SYM-test-kibi-release-version-script
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-kibi-release-version-cli
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-kibi-release-version-mcp
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs `bun run version-packages` in a fixture workspace and checks that it assigns the next calendar release version, patch-bumps kibi-core so the manifest ships and prepends the release to the history; checks that `release:check` fails on a drifted package version; and checks that `kibi --version`, the `kibi doctor` Kibi release check (including the mixed-install warning) and the MCP server title read the manifest that kibi-core ships.