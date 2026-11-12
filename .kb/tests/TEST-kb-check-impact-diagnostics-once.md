---
title: kb_check lists each impact diagnostic once
status: passing
priority: must
tags:
  - integration
  - unit
verification_scope: integration
origin:
  kind: agent
  ref: 'Maintainer request, 2026-11-12, after the review of release 2026.11.2 reported the findings: "Well, can you make a PR with a hotfix then?" and "Yes, do all post review work in the hotfix."'
  recorded_at: '2026-11-12T14:23:55.805Z'
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
    receipt_id: PR-2d8fb6c2af48e757fea31b3c
    test_id: TEST-kb-check-impact-diagnostics-once
    scope: integration
    outcome: passed
    code_snapshot: 0b03c3c442249e2aa7d6f864db987f1dae2198cb8d7afa0d509bc738029dde2f
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-12T14:24:37.111Z'
    finished_at: '2026-11-12T14:24:39.120Z'
    artifact_digest: 8ad746c43ea091652b3521615bb42bc4b0073635158bcdaa6759efbd1a181b1e
    contract_hash: a0d8b5de7089f78d821ee48379dfe942b64f5aa8f09d11d27d064e220e62b436
    binding_hash: 8c0f778a95faf39accbe6e1bb075fe891d7a3289dcb44a927b78c1f172f699a4
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
---
`packages/cli/tests/public-mutation/operations/check-format-shared.mutation.test.ts` asserts that a diagnostic the impact analysis reported is left out of `qualityDiagnostics` and of the quality section of the text while other quality diagnostics stay, and that impact diagnostics sharing a check, severity, files and suggestion are written under one suggestion. `packages/cli/tests/public/operations/migration-plan-coverage.test.ts` asserts that the review action of such a diagnostic names it by id and entity instead of copying it. It would pass falsely if the quality list held an equal copy rather than the reported object, so the fixture passes the same object in both lists as the check does.

Integration: `packages/mcp/tests/tools/check-impact.test.ts` calls the MCP `kb_check` handler with `sourceFiles` on a temporary workspace with a compiled KB and asserts that `multi_requirement_symbol_review` is under `impactDiagnostics` and not under `qualityDiagnostics`.
