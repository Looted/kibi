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
