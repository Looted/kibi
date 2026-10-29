---
title: The default telemetry endpoint shall be https://eu.i.posthog.com, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-telemetry-default-host
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-default-telemetry-host
  proves:
    - CLAIM-55E465F9B137434C
origin:
  kind: agent
  recorded_at: '2026-10-29T16:27:15.102Z'
id: TEST-proof-telemetry-default-host
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-98e30c3d4ffaae46fc478484
    test_id: TEST-proof-telemetry-default-host
    scope: unit
    outcome: passed
    code_snapshot: ec09c5c8360bc62374cc96794ed302e6b74770738cb7481a3617e21f01ce4a15
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:29:17.611Z'
    finished_at: '2026-10-29T16:29:17.764Z'
    artifact_digest: 99d74c51c3f691dd1271974ba720fedb87ccfa8621e15efe8b5f90ecc56f84a2
    contract_hash: 60e449556169b090aa983d94f7285b37f8fadd586aebe78a4b3d12fbe2fee6ca
    binding_hash: f6ed88bf526609f6227dd5903105b61b5d869f30499189e833904b21c03734da
    fingerprint: 5931990bbf3191b186eb4802c277d131fafa036622c0f52ccbc502c3d9403c63
    fingerprint_components:
      contract: 60e449556169b090aa983d94f7285b37f8fadd586aebe78a4b3d12fbe2fee6ca
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
      - symbol_id: SYM-proof-telemetry-default-host
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-telemetry-default-host
      pattern:
        symbol_id: SYM-const-default-telemetry-host
        type: string
        value: https://eu.i.posthog.com
    certificate_digest: 17cd472c4a13274cb1cd2f3b6cc6f8ac8e1e6907c7cac489db7701d7ba2d6b20
    claim_bindings:
      - claim_key: CLAIM-55E465F9B137434C
        requirement_id: REQ-kibi-telemetry-automation-keys
        fact_id: FACT-telemetry-default-host
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: https://eu.i.posthog.com
---
Proves that the default telemetry endpoint shall be https://eu.i.posthog.com, against the code Kibi reads at ingest.