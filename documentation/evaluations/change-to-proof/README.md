# Change-to-proof evaluation corpus

These JSONL files contain public, normalized evaluation inputs only. They do not
copy dogfood usage-log payloads or private source text. The evaluator reports
legacy and intent-aware retrieval separately and keeps proposition accounting,
status accuracy, and abstention precision independent so a high graph hit rate
cannot masquerade as semantic proof.

Run the corpus inventory with:

```bash
bun run scripts/change-to-proof-eval.ts \
  documentation/evaluations/change-to-proof/search-gold.jsonl \
  documentation/evaluations/change-to-proof/compile-gold.jsonl
```
