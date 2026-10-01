---
"kibi-cli": minor
---

Branches that each add symbols no longer have to hand-resolve `.kb/symbols.yaml`. The new `kibi merge-driver` command plugs into Git as a merge driver and merges Kibi's symbol manifest and relationship shards by record id, so concurrent additions merge cleanly while genuine disagreements still stop with conflict markers. A copyable GitHub Actions workflow applies the same merge to open pull requests whenever the default branch moves.

- feat(cli): add `kibi merge-driver <base> <current> <other>` (Git `%O %A %B`), a three-way id-keyed merge for `.kb/symbols.yaml` and `.kb/relationships/*.yaml` that keeps both sides' additions, applies one-sided edits and deletions, unions concurrent relationship/link additions, and falls back to `git merge-file` markers with exit 1 on a real conflict.
- docs: add `docs/examples/github/kibi-kb-merge.yml` and the "Merge conflicts in Kibi manifests" section of the GitHub integration guide.
