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
    receipt_id: PR-05d21ba8dd2e60b67e1804b1
    test_id: TEST-kibi-source-proof-kinds
    scope: end_to_end
    outcome: passed
    code_snapshot: 9047be498fc197c435142e860896573d1a49aa8afbfbe9e1a74da36586e81995
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T13:41:17.252Z'
    finished_at: '2026-10-28T13:42:53.088Z'
    artifact_digest: 958d09eb31815bdde93ae82f4edcbc6c33fae7dadc837479a1408ca449a4071d
    contract_hash: 20c103cf76e52b048113733bb9e4531032748bcf9fbbfb23ec1fa0c8459101ef
    binding_hash: e2fa67c080cce92f8d17ac213177ec2c777fb45832a823dcfcbbfe55fc658e67
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