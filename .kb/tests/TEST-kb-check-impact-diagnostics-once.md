---
title: kb_check lists each impact diagnostic once
status: passing
priority: must
tags:
  - e2e
  - integration
  - unit
verification_scope: end_to_end
origin:
  kind: agent
  ref: 'Maintainer request, 2026-11-12, after the review of release 2026.11.2 reported the findings: "Well, can you make a PR with a hotfix then?" and "Yes, do all post review work in the hotfix."'
  recorded_at: '2026-11-12T14:31:04.727Z'
id: TEST-kb-check-impact-diagnostics-once
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-kb-check-impact-diagnostics-once-verifier
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-60b21e09a9301ca353cfbe71
    test_id: TEST-kb-check-impact-diagnostics-once
    scope: end_to_end
    outcome: passed
    code_snapshot: b9a8a3d62f83e6f89fa3b9e015b701a8f0712935a62b51cea931eb7234a2233b
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-12T14:34:00.641Z'
    finished_at: '2026-11-12T14:34:04.536Z'
    artifact_digest: 9d9b8e52db62936cb44b13de2f74e8d1aa2d624400a5e82af61bd6ccdad4dc4d
    contract_hash: a0d8b5de7089f78d821ee48379dfe942b64f5aa8f09d11d27d064e220e62b436
    binding_hash: fc346d6ee2de157b95c97a1c6c1b09da06ecfee90390a42b1ff040ca3ac95986
    fingerprint: eaba0bc091cb8229360317757302b666e2fd71c1b960095512e64a437fb629e3
    fingerprint_components:
      contract: a0d8b5de7089f78d821ee48379dfe942b64f5aa8f09d11d27d064e220e62b436
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
      - symbol_id: SYM-kb-check-impact-diagnostics-once-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
verification_perspective: consumer
---
`packages/cli/tests/public-mutation/operations/check-format-shared.mutation.test.ts` asserts that a diagnostic the impact analysis reported is left out of `qualityDiagnostics` and of the quality section of the text while other quality diagnostics stay, and that impact diagnostics sharing a check, severity, files and suggestion are written under one suggestion. `packages/cli/tests/public/operations/migration-plan-coverage.test.ts` asserts that the review action of such a diagnostic names it by id and entity instead of copying it. It would pass falsely if the quality list held an equal copy rather than the reported object, so the fixture passes the same object in both lists as the check does.

Integration: `packages/mcp/tests/tools/check-impact.test.ts` calls the MCP `kb_check` handler with `sourceFiles` on a temporary workspace with a compiled KB and asserts that `multi_requirement_symbol_review` is under `impactDiagnostics` and not under `qualityDiagnostics`.

End to end: `packages/cli/tests/consumer/check-impact-diagnostics-once.test.ts` runs the built `kibi check --input -` with `sourceFiles` in a fresh repository with a compiled KB and asserts that no impact diagnostic is repeated under `qualityDiagnostics` and that each of their migration plan actions names the diagnostic with `listedIn: impactDiagnostics`. It fails on the 2026.11.2 build.
