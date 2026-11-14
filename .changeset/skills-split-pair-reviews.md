---
"kibi-runtime": patch
"kibi-cli": patch
"kibi-codex": patch
"kibi-claude": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

`kibi-usage` 2.48.0: the split recipe now records a `pair_reviews` entry for each pair of children that share a subject, with the claims of both and `origin.kind: agent`, and says that a verdict on requirements that are neither `must` nor firm needs no approval. The size guidance says review findings are listed in `kb_check`'s `qualityDiagnostics`, not in `violations`, so zero violations does not mean a finding is cleared.
