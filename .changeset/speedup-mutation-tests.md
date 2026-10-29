---
"kibi-cli": patch
"kibi-core": patch
---

Remove dead branches in the check speedups found by mutation testing (an unused subject helper, impossible fallbacks in plan ordering, redundant cache and attachment guards). Behavior is unchanged.
