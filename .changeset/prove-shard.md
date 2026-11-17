---
"kibi-cli": minor
---

`kibi prove` can split a run over parallel runners. `--shard K/N` keeps the K-th of N disjoint parts of the selected tests (ordered by id and dealt out in turn, before `--stale` applies), so N runs with `--shard 1/N` to `N/N` prove every selected test exactly once. `--list` prints the selected test ids as `{"tests": [...], "shard": "K/N"}` and runs nothing, so a join job can check that the shards together covered the whole selection.
