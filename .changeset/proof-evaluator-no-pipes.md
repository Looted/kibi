---
"kibi-cli": patch
---

Proof kinds that read a model from the code (rule, state machine, regex, exhaustive and source proofs) and the smt certificate re-check no longer hang when Kibi runs under Bun. The evaluator's output now goes through temp files instead of pipes: Bun can miss a pipe's readiness event, which left `kibi prove` or `kibi check` waiting until the 60-second spawn timeout and then reporting "Kibi could not evaluate the code".
