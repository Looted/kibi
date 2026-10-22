---
id: kibi-commit-review
name: kibi-commit-review
description: "Use when kibi check --staged or the Kibi pre-commit hook blocks a commit (kibi_impact_evidence_missing, symbols_manifest_stale, symbol_granularity_violation, symbol-coverage, kibi check-generated drift, Staged impact review failed), or when preparing a commit or pull-request impact review. Covers reading the per-file Detail lines, authoring .kb/symbols.yaml symbol entries through kb_upsert, kibi sync --refresh-symbol-coordinates, staging the tracked Kibi evidence with git add, kb_prepare_impact_review for a staged or diff scope, the kibi signoff requirements summary to show before a commit, and how merge commits and migration renames are judged."
version: 1.1.0
kibiCompatibility: ">=1.0.0"
tags:
  - kibi
  - commit
  - staged-check
  - traceability
  - agent-guidance
resources:
  - resources/staged-gate.md
---
## Goal

Get a commit through Kibi's staged gate by fixing the cause: the commit
carries the knowledge its behavior change needs, with current symbol
coordinates, so the gate passes for the same reason a reviewer would accept it.

## Interface Selection

Use the visible approved MCP tools or the trusted project-local CLI as equal
peer interfaces (CLI JSON: `printf '%s\n' '{}' | npx --no-install kibi status
--input -`). The gate itself is CLI: `npx --no-install kibi check --staged`
(add `--format json` for the full evidence). If neither surface is available,
stop and name the missing capability. Never read or edit `.kb/` files directly.

## When this applies

- `kibi check --staged` fails, or the pre-commit hook (`kibi check-generated
  --staged --changed-only`, then `kibi check --staged`) blocks a commit.
- You are about to commit or open a pull request and want the impact review
  ready first.

## Steps

1. **Read the whole failure.** Each finding names an id, the files, `Detail:`
   lines and a `Suggestion:`. Detail lines are complete per file: how many
   symbols extraction finds in the staged content, how many the staged
   evidence covers, and every symbol missing from `.kb/symbols.yaml` with its
   line. The common ids and their fixes are in `resources/staged-gate.md`.
2. **Find the owning knowledge.** `kb_search` with `sourceLocations` for each
   named file (or `kb_query({sourceFile})`), then `kb_query` the requirements,
   scenarios and tests it returns. Run `kb_check` with `sourceFiles`,
   `includeImpactDiagnostics: true` and `staged: true` to see the impact
   findings, including `requirement_statement_unverified` quotes.
3. **Decide what the change is.**
   - Behavior changed: update or record the knowledge (a requirement with a
     scenario, or a new clause) through `kb_upsert`. If the change contradicts
     a recorded rule, stop and ask; load `kibi-decisions`.
   - New or uncovered symbols: author a `symbol` entity per listed symbol
     through `kb_upsert` (`title` = the member the extractor names,
     `sourceFile`, `status: active`, `symbol_role: behavioral`, `implements`
     to the requirement, `covered_by` to the test). Then run
     `kibi sync --refresh-symbol-coordinates`.
   - Only coordinates moved: `kibi sync --refresh-symbol-coordinates`.
   - No behavior change (a genuine false positive): see the audited
     no-impact note in `resources/staged-gate.md`; it never covers a real
     behavior change.
4. **Stage the evidence.** Kibi authors tracked files but never Git-stages or
   commits them. `git status --short .kb` lists what it wrote; `git add` the
   entity Markdown, `.kb/relationships/` shards, `.kb/symbols.yaml` and
   `.kb/symbol-coordinates.yaml` that belong to this change (use `git add -p`
   when the files hold unrelated edits).
5. **Re-run** `kibi check --staged` (and `kibi check-generated --staged` when it
   failed) until it passes. Never bypass the hook (`--no-verify`) unless the
   person says so.

## Requirements signoff

Before you ask the person to approve a commit that adds, rewrites or retires
requirements, or changes code that implements them, show them what they are
signing off:

```
npx --no-install kibi signoff            # working tree; --staged for the index
```

It prints a ```` ```kibi-signoff ```` block listing each new, changed, affected
and retired requirement with its statement (before and after for a rewrite),
firmness, origin, scenarios and proof state. Paste it unchanged, then add one
or two sentences on why the requirements changed. Past 15 requirements, also
run `kibi signoff --format html --open` (on a remote machine, give the path it
prints). `--no-proof` skips the proof lookup, which reads coverage and is slow
on a large knowledge base. The summary is not an approval: never set
`approved_by` or `origin.ref` from it.

## Impact reviews

When the repository's base commit carries `.kibi/impact-policy.json`, the gate
also demands a content-bound review record at `.kibi/impact-review.json`
(`Staged impact review failed: impact_review_invalid ...`). Prepare it with
`kb_prepare_impact_review` (`scope: {"kind":"staged"}`, or `{"kind":"diff",
"baseCommit":"<40-hex sha>","headCommit":"<40-hex sha>"}` for a pull
request). It is read-only: it returns per-file evidence, requirement scopes,
residual review obligations and an unauthored record template. Draft each
file's `decision` from what you verified, leave `reviewer.id` for the person
who reviews, and never present the record as their approval. Field details are
in `resources/staged-gate.md`.

## Merge commits and migrations

During a merge (`MERGE_HEAD` exists), files staged unchanged from a merged
parent are skipped (`Merge commit: N staged file(s) are taken unchanged ...`);
only what the merge resolved or edited is judged. A commit that moves
knowledge into `.kb/` after `kibi migrate` is compared with the old paths
(`Baseline: HEAD with N staged knowledge rename(s) ...`), and symbol records
changed only by the migration are not judged as changed. Debt reported there
came from the branch or the old layout; the full `kibi check` still shows it.

## Typed results and report

Parse `kibiProtocol`, `status`, diagnostics and typed `nextActions` on every
Kibi write. On `committed_with_repairs`, run the repair actions and never
resend the original write. Report the findings you fixed (id, file, what
changed), the knowledge you recorded or confirmed still current, the files
you staged, the final `kibi check --staged` result, and anything left for the
person (an open rule conflict, an unauthored review decision).
