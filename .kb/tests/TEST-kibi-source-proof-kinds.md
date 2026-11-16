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
    receipt_id: PR-f20220a326b6c368ec01ab97
    test_id: TEST-kibi-source-proof-kinds
    scope: end_to_end
    outcome: passed
    code_snapshot: 11f442c7ec4bb6d8777db81ff07ba6a13346fd4d39b9ff7058236e99adc44d21
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T12:25:02.725Z'
    finished_at: '2026-11-16T12:25:35.549Z'
    artifact_digest: 59929ce8e9ae220ec891d07553e5f6a7928e05c283da7e67d8f98444f171a685
    contract_hash: 20c103cf76e52b048113733bb9e4531032748bcf9fbbfb23ec1fa0c8459101ef
    binding_hash: 95e6cc276e62d55180e6e856293982d4f28030483588c8f7429d9e7df6e4ea09
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