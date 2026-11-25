---
"kibi-cli": patch
---

`kibi check --staged` no longer reports a semantic inventory mismatch for a requirement whose grounding links appear both in its document and in a relationship shard. The staged snapshot now keeps one copy of such a link, as `kibi sync` does.
