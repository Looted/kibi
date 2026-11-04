---
title: The SkillOpt optimizer toolchain shares its contracts across TypeScript and Python, and the cell harness forwards only approved writes
status: passing
priority: should
tags:
  - skillopt
  - harness
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
links:
  - type: validates
    target: SCEN-skillopt-host-neutral-optimization
  - type: validates
    target: SCEN-skillopt-claude-code-host
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-skillopt-optimizer-toolchain
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-skillopt-optimizer-toolchain
    target: default
    native_id: documentation/tests/e2e/skillopt-optimizer-toolchain.e2e.ts::skillopt optimizer toolchain e2e
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, on covering the SkillOpt Python optimizer and cell harness: "Write a SkillOpt e2e test".'
  approved_by: maintainer
  recorded_at: '2026-11-04T13:30:00.000Z'
id: TEST-e2e-skillopt-optimizer-toolchain
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-412cec7b224832fbd5e1d2d7
    test_id: TEST-e2e-skillopt-optimizer-toolchain
    scope: end_to_end
    outcome: passed
    code_snapshot: b48ae08dc345eb89b585026e0d0dd163f0e79dcb623e1b2d37670be026d13f9b
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-04T13:09:30.000Z'
    finished_at: '2026-11-04T13:09:36.185Z'
    artifact_digest: 617a8ed7ff475162e24adc5b28e32902244ad20750aa70cf5641077f9f36d095
    contract_hash: b977b8213d90a0216336d280a5005b90043306c1948949ef87399b30a41ee0d7
    binding_hash: ff12cf3c09a5ce6b582e5657f863aa3a1b5ec9e21d3c51379e5d88d33490e092
    fingerprint: f35b6b6d55cf486b0806960e8d9f553ef6ff877551997a36a52a7128b68aaff8
    fingerprint_components:
      contract: b977b8213d90a0216336d280a5005b90043306c1948949ef87399b30a41ee0d7
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: ff2f87d8c9f14205f2c92cb77131f49eb2332ee900edea76a8ab7097943d2c10
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-skillopt-optimizer-toolchain
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the evaluator broker in front of a real downstream MCP process with a scripted user, then drives the Python optimizer under `uv run --project tools/skillopt`. It checks that the broker forwards one apply of the exact plan the scripted user approved and refuses replays, deletes, non-dry-run upserts and unknown tools; that the run-lock hash and the exact-approval check agree between the TypeScript contracts CLI and the Python contracts; that the Python bridge runner refuses to start cells without the staged runtime paths and binds offline bridge results to the same request hash as TypeScript; and that `python -m kibi_skillopt train` freezes the candidate under its body hash and refuses more than four steps. Only the model-calling ReflACT trainer is replaced; no model is called.
