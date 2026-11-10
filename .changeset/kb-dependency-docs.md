---
"kibi-runtime": patch
"kibi-cli": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

The `kibi-usage` skill now explains reading another repository's knowledge base: the read tools take `kb` to answer from a pinned KB dependency, a dependency is never written, and re-pinning with `kibi deps lock` is asked about first.
