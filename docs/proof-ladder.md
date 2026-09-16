# The requirement proof ladder

Consumer-facing reference for `proofStatus`, `proofStages`, `proofGaps`, and
`proofAdvisories` as reported by `kibi coverage --by req` and `kb_coverage`.
The authoritative implementation is `packages/core/src/requirement_proof.pl`
(proof version `kibi.requirement-proof.v3`); this document explains what each
stage means and what to do when it does not pass.

## Applicability: is the requirement in scope at all?

The ladder only evaluates **current** requirements. A requirement is current
when its `status` is one of:

- Canonical: `open`, `in_progress`, `closed`
- Legacy (accepted for backwards compatibility): `active`, `approved`

Everything else is out of scope by design. Two things can take a requirement
out of scope:

1. **Supersession** — a newer requirement links to it with `supersedes`.
2. **Status outside the vocabulary** — e.g. the ADR vocabulary `accepted`.
   Since that silently excludes the requirement from proof, `kibi check`
   reports it as a blocking `req-status-vocabulary` violation instead of
   letting it hide.

Out-of-scope requirements report:

```json
{
  "proofStatus": "not_applicable",
  "proofGaps": [],
  "proofStages": {
    "applicability": {
      "status": "not_applicable",
      "reason": "status 'accepted' is not a current requirement status"
    }
  }
}
```

The typed `reason` is what `not_applicable` used to hide: superseded
requirements say so; status-vocabulary mismatches name the offending status.

## Proof exemption: current but intentionally not E2E-provable

Some current requirements cannot be proven by end-to-end evidence —
toolchain-currency gates, architectural boundaries, quality-gate policy.
Parking them with an ADR status is exactly the trap above. Instead, mark them
explicitly in the requirement document:

```markdown
---
id: REQ-TOOLCHAIN-001
status: open
priority: must
proof_exempt: true
proof_exempt_reason: architectural boundary — verified by toolchain CI, not product E2E
---
```

`proof_exempt` requires a non-empty `proof_exempt_reason` (upsert validation
enforces the pairing, and the ladder ignores an exemption without a reason).
Exempt requirements report `not_applicable` with the author's reason attached,
so coverage can distinguish "cannot be proven" from "not proven yet".

To re-enter the proof ladder, remove both properties.

## The stages

For in-scope requirements the ladder evaluates nine stages, each reporting
`status` (and, for `productionSymbols`, a typed `reason` when it does not
pass):

| Stage | Meaning | Statuses |
| --- | --- | --- |
| `semanticInventory` | Every assertive proposition in the requirement's prose is inventoried and classified (modeled / unresolved / missing / nonlogical). | `passed`, `unresolved`, `missing` |
| `logicGrounding` | Modeled claims are grounded by strict property, predicate, or safe rule facts, one-to-one with the declared manifest. | `passed`, `missing`, `unresolved` |
| `contradictions` | No other current requirement contradicts this one over shared facts. Check completeness itself is visible. | `passed`, `blocked`, `unresolved` |
| `scenarios` | At least one scenario specifies the requirement (`specified_by`). | `passed`, `missing` |
| `scenarioTests` | Each scenario is validated by at least one test (`verified_by`/`validates`). | `passed`, `missing` |
| `passingE2E` | Every linked scenario has at least one end-to-end test, and every linked E2E proof-bearing test carries a valid, fresh, passing `kibi.proof-receipt.v1` bound to the current snapshot, contract hash, and fingerprint. Per-scenario results are exposed in `scenarioObligations`; unit/integration-only ancillary tests remain nonblocking. | `passed`, `missing`, `unresolved` |
| `executableSymbols` | Each qualifying E2E test is linked to executable test code via `executable_for`. | `passed`, `missing` |
| `productionSymbols` | Production symbols implementing the requirement are covered by those passing E2E tests (`covered_by`). | `passed`, `missing`, `blocked` |
| `sourceCoordinates` | The requirement source and all linked symbols carry exact published coordinates. | `passed`, `missing`, `blocked` |

### Stage statuses, precisely

- `passed` — the stage's obligations hold.
- `missing` — the evidence is absent. The stage names what is missing
  (`missingTests`, `missingReceiptTests`, `uncoveredSymbols`,
  `missingSymbols`, ...), and `proofGaps` carries the blocking gap code.
- `blocked` — the stage cannot be evaluated because an upstream input is
  unavailable. Only two stages use it:
  - `contradictions`: logical grounding is incomplete, so absence of a found
    conflict is not evidence of safety.
  - `productionSymbols`: there is no passing E2E evidence at all in the
    current snapshot (typically stale or missing receipts). The stage now
    says so with `reason` instead of an opaque word.
- `unresolved` — evidence exists but is not conclusive (e.g. unresolved
  propositions in the inventory).

A `blocked` stage never silently downgrades a requirement's proof status: it
maps to `proofStatus: unresolved`, not `proven`.

## Gaps, advisories, and status

- `proofGaps[]` — blocking only. Every entry carries a code (e.g.
  `missing_proof_receipt`, `missing_production_symbol_coverage`), a priority,
  a stage name, and a suggested repair action.
- `proofAdvisories[]` — explicitly non-blocking context. Receipt-completeness
  codes (`missing_proof_receipt`, `stale_proof_receipt`,
  `failed_proof_receipt`, `invalid_proof_receipt`, and
  `proof_contract_mismatch`) remain blocking for every linked E2E obligation;
  they are never downgraded because another scenario has a passing receipt.
- `proofStatus` — the headline:
  - `proven` — all stages passed (`proofGaps` is empty by invariant).
  - `missing` — at least one stage is `missing` (evidence absent).
  - `unresolved` — evidence is inconclusive or a stage is `blocked`.
  - `not_applicable` — out of scope; see applicability above.
- `proofRepairs[]` — ranked concrete recovery actions derived from blocking
  gaps.

## Common failure patterns

| Symptom | Usual cause | Fix |
| --- | --- | --- |
| `productionSymbols: blocked` | No passing E2E receipts in the current snapshot at all | Run `kibi prove` to refresh receipts, then re-check |
| `missing_symbol_coordinates` gap | Symbol has no coordinate entry; often `granularity_reason` missing so the coarse fallback was gated off | `kibi sync --refresh-symbol-coordinates` reports failed ids and reasons; add `symbol_role`/`granularity_reason` where the reason says to |
| Requirement missing from proof reports entirely | Non-current status or supersession | Coverage `--status not_applicable --by req` lists it with the typed applicability reason |
| `passingE2e.scenarioObligations` has a non-passed status | A linked scenario has no E2E test or one of its E2E proof-bearing tests lacks qualifying evidence | Inspect the scenario's `gaps`, repair every listed receipt, and run `kibi prove` |

## Related surfaces

- `kibi coverage --by req --status missing` (also: `proven`, `unresolved`,
  `not_applicable`) — enumerate exactly one proof-status slice; N/A rows
  include their applicability reason. The summary always reflects the whole
  KB.
- `kibi proof inspect` — detect test infrastructure and pick a proof
  integration.
- `kibi proof prune --keep 1` — drop superseded receipts (re-proving the same
  snapshot appends duplicates).
- `kibi proof migrate-legacy` — remove legacy `verification_receipts` blocks
  from tests that already carry a `proof_contract`.
- `docs/proving-requirements.md` — the runner-neutral proof pipeline:
  contracts, integrations, artifacts, and how `kibi prove` produces receipts.
