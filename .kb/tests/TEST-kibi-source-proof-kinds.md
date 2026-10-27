---
title: Source proof kinds and temporal machine claims through kibi prove with the packed CLI
status: passing
tags:
  - proof
  - certificate
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-source-proof-kinds
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-26T17:38:49.219Z'
id: TEST-kibi-source-proof-kinds
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-be8936e244ef6dba29798243
    test_id: TEST-kibi-source-proof-kinds
    scope: end_to_end
    outcome: passed
    code_snapshot: de83f942c55fea0e010711ee2d8adf6d197ea8ae631aaf1a7a1d77582042df88
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-26T17:39:40.485Z'
    finished_at: '2026-10-26T17:41:03.833Z'
    artifact_digest: 5eff421e29ebf759b197036362d09a9bf2f98614bbebd11236f91a16b54fdca6
    contract_hash: 20c103cf76e52b048113733bb9e4531032748bcf9fbbfb23ec1fa0c8459101ef
    binding_hash: 9af57873df4c8135ce6533130dfdd7da6122769eb65cc13ba104af653cb0f6b5
    fingerprint: 8fb25ab62e1f5dcd8ee0847a46fcfdd8fa065fab0da5b2bd53188ad99efa1427
    fingerprint_components:
      contract: 20c103cf76e52b048113733bb9e4531032748bcf9fbbfb23ec1fa0c8459101ef
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
      - symbol_id: SYM-e2e-packed-source-proof-kinds
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the packed CLI on a sandbox project with a Hono app, a configuration module, SQL migrations and an invoice transition table, models the claims with the semantic advisor, and checks that source and state_machine proofs derive them at proved, that a route without the middleware is rejected, and that a re-run after the code reads a new environment variable rejects the claim with it.