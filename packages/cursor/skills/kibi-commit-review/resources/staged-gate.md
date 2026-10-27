# The staged gate

Reference for `kibi-commit-review`: what `kibi check --staged` and
`kibi check-generated --staged` report, how to fix each finding, and the
impact-review record. The staged check reads blob content from the Git index,
not the working tree, so a fix counts only once it is staged.

## Reading a finding

```text
symbols_manifest_stale: .kb/symbols.yaml does not cover the declarations of staged source files: src/billing/refund.ts
  Detail: src/billing/refund.ts — extraction finds 4 symbol(s), evidence covers 3.
      Not in .kb/symbols.yaml: approveRefund (line 42)
  Suggestion: Author .kb/symbols.yaml entries for the uncovered symbols (kibi upsert, with implements/covered_by links). Stage .kb/symbols.yaml with the behavior edit, then re-run kibi check --staged.
```

- Detail lines name every symbol, never a shortened list. `Evidence without a
  matching symbol:` lists manifest entries whose declaration is gone or
  renamed: rename the symbol's `title`, or retire the entry.
- `--format json` carries the same lists in the diagnostic `evidence`
  (`symbolsManifest[].missing` / `extra`, `uncoveredSymbols[].titles`).

## Blocking findings

| Id or message | Cause | Fix |
| --- | --- | --- |
| `kibi_impact_evidence_missing` | A staged behavior edit (changed lines in exported or behavior-bearing code, not comments or formatting) has no staged Kibi evidence. Test-only edits do not need it unless they add executable test symbols. | Query the owning knowledge; update it when behavior changed; stage entity Markdown under `.kb/` or authored `.kb/symbols.yaml` entries for the listed symbols. A file whose every declaration already has a `.kb/symbols.yaml` entry needs nothing more. |
| `symbols_manifest_stale` | A staged behavior file declares symbols `.kb/symbols.yaml` has no entry for, or an entry names a declaration that is gone. | Author entries for the listed symbols, re-point or retire entries whose declaration is gone, and stage `.kb/symbols.yaml`. Coordinates are derived locally and never staged. |
| `symbol_granularity_violation` | A changed behavioral member is owned only by a coarse class or module symbol while a narrower declaration exists. | Add a symbol for the member itself (`title` = `Class.method` or the exported function) with its own links; use `granularity_reason` (`config-artifact`, `module-level-behavior`, `extractor-miss`, `legacy-link`, `test-suite`) only when it is true. |
| `symbol-coverage` | A changed symbol, or a symbol whose staged manifest entry changed, fails the full-check rule on the staged knowledge. | The symbol `implements` the requirement and is `covered_by` a test that verifies it: through the requirement's scenario (`verified_by` scenario -> test) when it has one, else `verified_by` requirement -> test. A direct requirement -> test link does not count while a scenario exists. The finding's suggestion names the missing link (see `kibi-traceability`). |
| `kibi_impact_override_missing_rationale` | A `Kibi-Impact: none` declaration has no `Rationale:` line. | Add the rationale, or drop the declaration and stage real evidence. |
| `entity-context-missing` (staged entity) | A staged requirement, scenario, test, ADR or observation fact has fewer than 12 words of context. | Upsert a sectioned `document.body` (see `kibi-usage`, Entity body contract). |
| `domain-contradictions`, `kb-consistency`, `scenario-feasibility`, `exception-claim-keys` (staged `.kb/` change) | The staged knowledge introduces a violation the last commit did not have. `kb-consistency` also catches facts that contradict only together and names their requirements. | Fix the knowledge; a contradiction with a recorded rule goes to the person (`kibi-decisions`). |
| Proposition-complete ingestion | A staged requirement's semantic inventory is missing or no longer matches its prose. | Re-derive it (`kb_model` analyze with the complete prose) or run `kibi migrate` for drift. |
| `kibi check-generated --staged` drift | The staged `.kb/symbols.yaml` is not in the layout sync writes, or `.kb/symbol-coordinates.yaml` is tracked. | `kibi sync --refresh-symbol-coordinates`, review the diff, stage only the intended hunks (`git add -p`); untrack a tracked coordinates file with `kibi migrate` (or `git rm --cached`). |
| `Staged impact review failed: impact_review_invalid: ...` | The base commit has `.kibi/impact-policy.json` and the staged `.kibi/impact-review.json` is missing, stale or incomplete. The message names the cause (missing review path, stale fingerprint, ...). | Prepare a fresh record (below). Any later staged change makes the fingerprints stale again, so prepare it last. |

The staged gate does not judge evidence levels: the `evidence-floor` rule
runs only in a full `kibi check`. A firm requirement staged without an
end-to-end proof passes the commit and fails that check later (see
`kibi-decisions` for `required_evidence`).

## Advisory findings

These warn but do not block. Read them; they are often the real review.

- `requirement_statement_unverified`: quotes each current requirement the
  changed code implements, with its firmness. Compare the code with the
  statement yourself.
- `symbol_semantic_review_needed`: the links exist, but check that the linked
  requirement, scenario and test still describe the changed behavior. In a
  file with no linked symbol it says no recorded intent covers the change.
- `staged_file_ownership_missing` / `staged_file_impact_review_needed`: a
  staged text file (not TypeScript or JavaScript) has no owning requirement,
  or has one and no matching evidence changed.

## Audited no-impact declaration

For a false positive or an edit that changes no behavior, Kibi accepts a
staged Markdown note in a knowledge lane under `.kb/` with the two lines

```text
Kibi-Impact: none
Rationale: <why the staged source edits change no behavior>
```

It never satisfies a genuine behavior change, and it is visible in review.
Prefer real evidence; use the note only when the person agrees the edit has
no behavior impact.

## Impact-review record

`kb_prepare_impact_review` (CLI `prepare-impact-review --input`) takes only
`scope`: `{"kind":"staged"}`, or
`{"kind":"diff","baseCommit":"<sha>","headCommit":"<sha>"}` with full
lowercase 40- or 64-hex commit ids. It returns `status: ready_for_authoring`,
the `snapshot` identity, `recordHeaders` (policy, evaluator and scope
fingerprints), complete per-file evidence in `files`, `requirementScopes`,
`residualReviewObligations`, and `authorship` with the record schemas and an
unauthored `recordTemplate`.

Fill only the authored fields (`files[].decision`, `files[].analysisReviews`,
`reviewer.id`, `reviewedAt`) and write the record to `.kibi/impact-review.json`,
then stage it. A file `decision` is one of:

- `{"kind":"impact","requirementIds":[...],"knowledge":{"state":"still_current","rationale":"..."}}`
- `{"kind":"impact","requirementIds":[...],"knowledge":{"state":"updated","entities":[{"entityId":"...","artifactPath":"...","beforeFingerprint":"<sha256 or null>","afterFingerprint":"<sha256>"}]}}`
- `{"kind":"no_impact","reason":"...","rationale":"..."}`
- `{"kind":"not_applicable","policyReason":"...","rationale":"..."}` (only
  where the policy lists the path as not applicable)

`reviewer.source` is `self-claimed-local`: the record says who reviewed, it
does not prove it. Put the person's id there only when they reviewed it.

## Commands

```bash
npx --no-install kibi check --staged                    # the gate
npx --no-install kibi check --staged --format json      # with full evidence
npx --no-install kibi check-generated --staged          # manifest drift
npx --no-install kibi sync --refresh-symbol-coordinates # rebuild local coordinates
git status --short .kb                                  # what Kibi wrote
```
