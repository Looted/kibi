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
    receipt_id: PR-eab699b8e7113b4783cc8148
    test_id: TEST-kibi-source-proof-kinds
    scope: end_to_end
    outcome: passed
    code_snapshot: 5434da306c269b06f3ab3332686aeca47fd3a0e8a998befaf06388d5c53900c8
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T12:18:50.828Z'
    finished_at: '2026-11-16T12:19:37.037Z'
    artifact_digest: 66318a05e67568cab6e6554be7ecefba4a61d93840f04b162b7958c75c94f371
    contract_hash: 20c103cf76e52b048113733bb9e4531032748bcf9fbbfb23ec1fa0c8459101ef
    binding_hash: 020d62786a4814ca9ed5472b26967a703ca89fea323122ea36a43e7cb53360c6
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