# Change-to-proof evaluation corpus

These JSONL files contain public, normalized evaluation inputs only. They do not
copy dogfood usage-log payloads or private source text. The evaluator reports
retrieval metrics and keeps proposition accounting,
status accuracy, and abstention precision independent so a high graph hit rate
cannot masquerade as semantic proof.

`evaluateSearch` credits source recall only when the expected entity is in the
top five and its returned source evidence covers the expected path and any
gold symbol or coordinate. `evaluateGoldCorpus` runs both search and compile
scoring lanes over the supplied cases through caller-provided live adapters;
the inventory command below only reports corpus sizes. Compile proposition
counts and semantic proposition-key identity are scored separately, so a
wrong proposition with the right count can pass count accounting but cannot
pass the identity lane.

Run the corpus inventory with:

```bash
bun run scripts/change-to-proof-eval.ts \
  documentation/evaluations/change-to-proof/search-gold.jsonl \
  documentation/evaluations/change-to-proof/compile-gold.jsonl
```

Run the same corpus through the production intent-search ranker and
compile-intent operation in an isolated temporary fixture workspace with:

```bash
bun run scripts/change-to-proof-eval.ts --live \
  documentation/evaluations/change-to-proof/search-gold.jsonl \
  documentation/evaluations/change-to-proof/compile-gold.jsonl
```

The live mode fails closed if a labeled positive is missed, source evidence
does not cover its expected location, an unrelated case is not abstained, or
proposition/status accounting diverges. Compile cases name pre-seeded fixture
requirement IDs; the runner writes those requirements and strict retention
facts into an isolated temporary branch store, then invokes the real
`PrologProcess` and compile-intent operation. Contradiction status therefore
comes from the KB graph's `contradicting_reqs/3` query rather than from a
case-ID branch in the evaluator.

Search ranks fixed fixture entities; it does not exercise KB-backed candidate
loading. A case's `sourceLocation` is supplied query context as well as the
location against which returned evidence is checked. Source recall therefore
measures source-guided fixture retrieval, not independent source discovery.

The compile cases use explicit `update` targets because contradiction analysis
currently inspects persisted current requirements; a new `create` draft does
not itself add draft facts for contradiction analysis. That API boundary is
kept visible rather than treating a create-mode draft as blocked by fiat.

This fixture run exercises a direct retrieval, a source-symbol retrieval,
unrelated-source abstention, scalar ambiguity, contradiction, and negation; it
is a representative smoke corpus, not a claim of broad semantic coverage.

## Repository KB search gate

`repo-search-gold.v2.jsonl` asks Kibi's own KB realistic questions through the
built CLI (`kibi search --input -`, one process per question). Each case lists
the current requirements that govern the answer (`expectedIds`); three cases
must abstain, and fourteen name the superseded or closed requirements a naive
match would return (`supersededIds`). The file is versioned: when the KB
changes what governs a question, add a new version rather than editing labels
in place, so a score change is never a silent relabelling. `v2` keeps the 36
questions of `v1` and moves five of them to the requirements that superseded
their v1 answers (`REQ-kibi-search-answer-layer-v2`,
`REQ-kibi-fresh-verification-receipts-v2` twice,
`REQ-kibi-scenario-feasibility-v2` and `REQ-branch-store-recovery-v4`), listing
each replaced requirement under `supersededIds`.

```bash
bun run build && bun packages/cli/bin/kibi sync
bun run scripts/change-to-proof-eval.ts --repo-kb \
  documentation/evaluations/change-to-proof/repo-search-gold.v2.jsonl \
  --thresholds documentation/evaluations/change-to-proof/repo-search-thresholds.json
```

The runner stops the engine, warms it with one question outside the gold set,
then asks each question once and prints:

- `recallAt3`: share of positive cases with an expected id in the top three of
  `answer.governing` or of the ranked results.
- `supersededResultRate`: share of positive cases whose governing answer or top
  three results include a requirement the gold set labels superseded.
- `abstentionPrecision` / `abstentionRecall`: an abstention is an answer that
  names no governing requirement.
- `latencyMs`: warm-up time, then p50, p95 and max per question, including CLI
  start-up.

`repo-search-thresholds.json` holds the gate, set just under the measured
baseline (recall@3 0.94, no superseded results, abstention precision and recall
1.0, p50 about 2.0 s and p95 about 2.4 s on a 4-core machine): each quality
metric tolerates one more failing case than the baseline and fails on the
second, and the latency ceilings are the 3 s budget for p95 and 2.5 s for p50. The `proof` workflow runs this gate after the proof
baseline. Misses, superseded results and false abstentions are listed in the
output so a failure says which question regressed.
