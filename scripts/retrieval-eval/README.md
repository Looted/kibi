# Retrieval replay

Offline replay of search and edit-time retrieval over a Kibi store. It compares today's `kb_search` ranking and today's edit hook with the scoped decision retriever in `packages/agent-core/src/retrieval.ts`, with and without embeddings fused in.

```sh
bun scripts/retrieval-eval/run.ts \
  --store <dir holding .kb> \
  --workspace <source checkout the store describes> \
  --suites decision-questions,synthetic-change,synthetic-omission \
  --retrievers kibi-search-today,cards-words,cards-fused \
  --scale 1,10 --split dev
```

Other flags:

- `--scale 1,10` runs at each listed size. Size N crowds the store with N-1 look-alike copies of every decision from a knowledge source that no expected decision comes from.
- `--hide-expected-links` removes each case's governing decision's code links for that case only.
- `--json <file>` also writes every row to a file.
- `--split` takes `dev`, `holdout`, `report` or `all`.
- The other retrievers are `edit-hook-today`, `cards-words-noscope` and `cards-fused-noscope`.

Each row reports the top-one, top-five and top-ten rates, the share of cases whose decision is missing, the weakest group's top-ten rate, the median latency and the mean answer length in characters.

## Case sets

The fixtures are in `documentation/evaluations/retrieval/`.

| Suite | File | Split |
|---|---|---|
| `decision-questions` | `papra-decision-questions.v1.jsonl`: user-language questions about real Papra decisions | `dev` and `holdout`, by `sha256(id) % 3` |
| `synthetic-change`, `synthetic-omission` | `papra-synthetic-edits.v1.jsonl`: edits that change a governed line or add a code path that leaves out a check | `dev` and `holdout` |
| `agent-searches`, `agent-controls` | `papra-agent-searches.v1.jsonl`: searches agents typed in a benchmark run | `report` |
| `edit-sessions` | `papra-edit-sessions.v1.jsonl`: the same run's sessions that edited source | `report` |
| `kibi-repo-gold`, `kibi-hints-gold` | This repository's own search gold sets in `documentation/evaluations/change-to-proof/`, read as they are | `dev` |

The decisions in `papra-frozen-decisions.json` are probed by frozen benchmark arcs. No question or synthetic edit is written for them. The agent and edit-session suites are entirely about those decisions, so they are only reported and are never used to choose a design or a weight. Only `dev` cases may guide tuning. Read `holdout` cases once, at the end.

## Inputs

- `--store` is a directory holding the benchmark's crowded Papra store (`.kb`), from the benchmark repository.
- `--workspace` is a Papra source checkout at the commit the store was recorded against (`e7acb46f9bc6`). Scope comes from which linked files exist there. Without it, every linked file counts as present.
- `cards-fused` loads the bundled static embedding from `packages/plugin-search-hints`.
