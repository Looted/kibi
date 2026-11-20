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
    receipt_id: PR-51b3b64f361359ebd1a5ed76
    test_id: TEST-e2e-skillopt-optimizer-toolchain
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: b977b8213d90a0216336d280a5005b90043306c1948949ef87399b30a41ee0d7
    binding_hash: bab21dcb17d0152229f08d2f0db46fe5a8b2d226c943906896e7709aca3a9c93
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
