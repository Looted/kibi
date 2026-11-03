---
"kibi-agent-core": patch
---

Filter "always" (and every other request stop word whose stem differs from the word) out of a request's topic words. The stop lists were compared against stemmed words, so "always" became "alway" and was kept as a topic word, which skewed the requirement candidates shown for unlinked files. Path policy, hook usage logging and the decision-guard markers drop unreachable checks without changing behaviour.
