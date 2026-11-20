---
id: TEST-kibi-logical-requirement-coverage
title: Clause-complete logical requirement modeling tests
status: passing
created_at: 2026-08-04T00:00:00.000Z
updated_at: 2026-08-04T00:00:00.000Z
source: packages/core/tests/kb.plt
tags:
  - requirements
  - prolog
  - semantic-advisor
  - skillopt
  - unit
  - integration
verification_scope: end_to_end
links:
  - type: validates
    target: SCEN-kibi-logical-requirement-coverage
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-cli-workflows
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-08e2c70b921d1a483e839e68
    test_id: TEST-kibi-logical-requirement-coverage
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 6907ef1dd1aafd78b6175964c54f50e6a3e16c4660bbf6b8ecf05d3c6f654bb4
    binding_hash: f4f0e7adef7e5e4bea1bee68d419d6f0a3c3fc5dd7c4c78509f546e0424ceb06
    fingerprint: 5802a43cc4640a02573b20e676f828c1d5e5aff77b3354c3d78855fbba53e8ae
    fingerprint_components:
      contract: 6907ef1dd1aafd78b6175964c54f50e6a3e16c4660bbf6b8ecf05d3c6f654bb4
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
      - symbol_id: SYM-e2e-cli-workflows
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Verifies stable clause keys including trailing-punctuation normalization, compound semantic-advisor receipts, merged modeling manifests, paired and hash-consistent claim provenance, bijective manifest-to-ground-fact coverage, duplicate-term rejection, lossless repeated-relationship decoding, default rule activation, title-independent logical-debt diagnostics, exact predicate polarity contradictions, MCP contradiction rejection, MCP schema preservation of claim patterns, uniqueness, and conditional provenance, staged-overlay preservation of manifests, predicate fields, and verification metadata, final-state evidence normalization, and Skillopt logical-coverage scoring.

Executable coverage spans `packages/core/tests/kb.plt`, `packages/cli/tests/traceability/temp-kb.test.ts`, `packages/mcp/tests/semantic-advisor/analyze-prose.test.ts`, `packages/mcp/tests/server/tools.test.ts`, `packages/mcp/tests/tools/model-requirement.test.ts`, `packages/mcp/tests/tools/suggest-predicates.test.ts`, `packages/mcp/tests/tools/upsert-contradictions.test.ts`, the packed MCP parity tests, and the Skillopt evaluator tests.
