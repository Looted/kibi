---
title: HTML requirement health report CLI and renderer tests
status: passing
tags:
  - cli
  - report
  - html
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
id: TEST-kibi-html-health-report
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-cli-html-report
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-350a8625960feb7c36e49246
    test_id: TEST-kibi-html-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 379aa918061d87d478f5c6907af80b9d31dab67e9189a94467199a38d0fd1ea4
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-05T07:15:15.029Z'
    finished_at: '2026-11-05T07:15:58.413Z'
    artifact_digest: d2b85cd164cf519fd2f4b55ebea6f05419c4aa4d8faa238f43ee6a79fdeb6a1d
    contract_hash: 2f31254052a59a9fb46df94ddf4c6f43dff44ea0a598a852a1be4d8b139b509f
    binding_hash: b60219cb3e96af5bcb7f8270d42d3bb7fe67f83b6161105cef84db29a7991a12
    fingerprint: 2f3df781634b239cd492e250ef08d6d1d03d12f3f8da40e0470916f004101c62
    fingerprint_components:
      contract: 2f31254052a59a9fb46df94ddf4c6f43dff44ea0a598a852a1be4d8b139b509f
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
      - symbol_id: SYM-e2e-packed-cli-html-report
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Covers the pure HTML renderer, command output and browser-launch sequencing, pagination safety, HTML escaping, and a packed consumer workflow that generates the report through the installed CLI.