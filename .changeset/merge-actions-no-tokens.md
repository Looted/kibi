---
"kibi-cli": patch
---

The `merge-train` and `kb-merge` actions now run `kibi sync` and the `check` command in the merged tree without `GH_TOKEN`, `GITHUB_TOKEN` or the Actions runtime tokens in their environment, since that tree holds pull request content. `scripts/proof-gate.sh` takes `KIBI_RUNNER` (bun unless set), and Kibi's own merge workflows now run the base checkout's copy of the gate with node, so neither the merged tree's script nor its `bunfig.toml` runs with the token that pushes. The action docs say to point a check script at the base checkout by absolute path.
