---
"kibi-cli": patch
---

New GitHub Action `Looted/kibi/actions/kb-merge` keeps pull requests mergeable when their only conflicts are Kibi manifests (`.kb/symbols.yaml`, `.kb/relationships/*.yaml`). GitHub's merge check never runs a custom merge driver, so the action does the merge itself: it test-merges each open same-repository pull request, merges the base branch in with `kibi merge-driver` when only manifests conflict, runs `kibi sync` and a configurable check on the merged tree, and pushes the merge commit only when both pass. A branch that moves while it is being merged is merged again on its new tip; fork pull requests, other conflicts and real conflicts inside a manifest are left for a person. The example workflow in `docs/examples/github/kibi-kb-merge.yml` now uses the action and runs on every push, and `docs/github-integration.md` covers setup, tokens and what it does not resolve.
