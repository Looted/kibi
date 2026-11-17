---
"kibi-cli": patch
---

The merge train action takes a new `train-checks` input: checks a train must pass before it lands, but a pull request does not need to board. A repository whose full proof is too slow for every pull request can now run it only on `merge-train/` branches, so the proof runs once per batch instead of once per pull request.

- `Looted/kibi/actions/merge-train` reads `train-checks` (`MERGE_TRAIN_TRAIN_CHECKS`); boarding still uses `checks`, landing requires both.
- A failed train check is re-run once and bisected like any other required check.
