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
    receipt_id: PR-1a0cd0f22d20c4ff1ba630e4
    test_id: TEST-proof-telemetry-default-host
    scope: unit
    outcome: passed
    code_snapshot: 50b51c3ad5a6f40637c27165dbdf5bf7bb49b7dfdbd3465be4bc86e3cb482007
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-03T14:33:17.157Z'
    finished_at: '2026-11-03T14:33:17.306Z'
    artifact_digest: ff9c702ce6069a0a32d3fec730eb7796317dd755caf5594436cb24cde48caa24
    contract_hash: 60e449556169b090aa983d94f7285b37f8fadd586aebe78a4b3d12fbe2fee6ca
    binding_hash: 76288dda7c56e6c0b33796ab9eb357615c262b468ff3f7efa961681fba09e0f9
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