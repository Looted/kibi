---
"kibi-cli": patch
---

New GitHub Action `Looted/kibi/actions/merge-train` lands labelled pull requests in batches. It merges the boarded pull requests into one `merge-train/` branch with `kibi merge-driver`, running `kibi sync` and a check after each merge. It opens that branch as a pull request so the repository's checks run once for the whole batch, and merges it only when the required checks passed on the exact head it assembled.

- A pull request boards only when it carries the `train` label, is not a draft, comes from the repository, and its required checks passed on its current head.
- A failed train re-runs its failed jobs once, then proves each half separately. Only a train of one pull request that fails twice ejects that pull request, with a comment.
- See "Land pull requests in a merge train" in `docs/github-integration.md` and the example workflow `docs/examples/github/kibi-merge-train.yml`.
