---
title: Local proof checks catch the regressions the CI proof gate enforces
status: open
priority: must
owner: proof
tags:
  - proof
  - ci
  - tooling
  - evidence-floor
semantic_text: Maintainers can replay the CI proof gate locally against a clean clone of the committed HEAD. The local proof gate runs the same evidence-floor check as the CI proof workflow before a push, without re-proving.
proof_exempt: true
proof_exempt_reason: Repository proof tooling that drives the CI proof workflow itself; verified by the script unit contracts (TEST-kibi-local-proof-parity) and exercised end to end by the CI proof workflow, not by a packed product E2E.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c86329acc3546c1ea21d2f3faeb6a04aec0eae49a12bd451af27a10a73608b85
semantic_inventory:
  - claim_key: CLAIM-DF1C8C7846819DEC
    claim_text: Maintainers can replay the CI proof gate locally against a clean clone of the committed HEAD
    role: descriptive
    span:
      start: 0
      end: 92
    status: ontology_gap
    reason: No predicate or property vocabulary describes repository proof tooling capabilities; the claim is verified by TEST-kibi-local-proof-parity rather than grounded as a fact.
  - claim_key: CLAIM-3A02520E2DF5E118
    claim_text: The local proof gate runs the same evidence-floor check as the CI proof workflow before a push, without re-proving
    role: normative
    span:
      start: 94
      end: 208
    status: ontology_gap
    reason: No predicate or property vocabulary describes repository proof tooling capabilities; the claim is verified by TEST-kibi-local-proof-parity rather than grounded as a fact.
logic_claims:
  - CLAIM-DF1C8C7846819DEC
  - CLAIM-3A02520E2DF5E118
id: REQ-kibi-local-proof-parity
type: req
origin:
  kind: human
  ref: 'Maintainer decision, 2026-10-24, approving the formal-proof design phase that replaces proof/baseline.json with evidence floors: "I''d like to do all the remaining phases."'
  recorded_at: '2026-10-24T09:00:00.000Z'
---
Maintainers can replay the CI proof gate locally against a clean clone of the committed HEAD. The local proof gate runs the same evidence-floor check as the CI proof workflow before a push, without re-proving.

## Rationale

Local proof runs used to diverge from CI: nested worktrees resolved the parent checkout's modules and hooks, and gates such as `check-generated --staged` did not run on commit. `bun run proof:replay` replays the proof job from `.github/workflows/proof.yml` in a clean clone, and `bun run proof:gate` runs the evidence-floor gate in under a minute; stale receipts only fail the `--fresh-evidence` run CI makes after re-proving.

## Why this changed

The local gate used to compare coverage with proof/baseline.json in a semantic-only mode that set stale evidence aside. Evidence floors replaced the baseline file, so the local gate now runs the evidence-floor check, which treats receipts that are only older than the code as pending re-proof.
